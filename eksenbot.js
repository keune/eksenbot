import './env-config.js';
import {AtpAgent, RichText} from '@atproto/api';
import axios from 'axios';
import {createConnection} from 'mysql2/promise';
import {d, propositionCase, toTitleCase} from './helpers.js';

let dbConnection = null;
const getDbConnection = async () => {
  if (dbConnection && dbConnection.connection._fatalError === null) {
    return dbConnection;
  }

  try {
    dbConnection = await createConnection({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    dbConnection.on('error', (err) => {
      console.error('Database connection error:', err);
      dbConnection = null;
    });
  } catch (error) {
    console.error('Error creating database connection:', error);
    dbConnection = null;
  }

  return dbConnection;
};

const getLastEksenRowFromDB = async () => {
  const dbConnection = await getDbConnection();
  if (dbConnection) {
    const [rows] = await dbConnection.execute(
      'select artistName, trackName from eksen order by id desc limit 1',
    );

    if (rows.length == 1) {
      return rows[0];
    }
  }

  return null;
};

const getYtVideoIdFromDB = async (artistName, trackName) => {
  const dbConnection = await getDbConnection();
  if (dbConnection) {
    const sql = `select youtubeVideoId from youtube 
    where artistName = ? and trackName = ? and isCorrect = 1 limit 1`;
    const [rows] = await dbConnection.execute(
      sql,
      [artistName, trackName],
    );

    if (rows.length == 1) {
      return rows[0].youtubeVideoId;
    }
  }

  return null;
};

const checkAndPost = async () => {
  const npUrl = 'https://radioeksen.com/umbraco/surface/Player/EksenPlayerSong?_=' + Date.now();

  try {
    const npResponse = await axios.get(npUrl);
    const npData = npResponse.data;

    if (npData.NowPlayingArtist) {
      let artistName = npData.NowPlayingArtist;
      let trackName = '';

      if (!trackName && artistName.includes(' - ')) {
        const singleLine = artistName.split(' - ');
        if (singleLine.length === 2) {
          artistName = singleLine[0].trim();
          trackName = singleLine[1].trim();
        }
      }

      if (!artistName || !trackName) {
        d('No data');
        return;
      }

      trackName = trackName.replace('_', ' ');
      trackName = toTitleCase(trackName);
      trackName = propositionCase(trackName);

      artistName = artistName.replace('_', ' ');
      artistName = toTitleCase(artistName);
      artistName = propositionCase(artistName);

      if (artistName.toLowerCase() == 'reklam' || trackName.toLowerCase() == 'reklam') {
        d('ads - pass');
        return;
      }

      const lastRow = await getLastEksenRowFromDB();
      let same = false;
      if (lastRow) {
        if (lastRow.artistName.toLowerCase() == artistName.toLowerCase() &&
        lastRow.trackName.toLowerCase() == trackName.toLowerCase()) {
          same = true;
        }
      }
      if (!same) {
        const sql = 'insert into eksen(artistName, trackName, responseTxt) values(?, ?, ?)';
        const [rows] = await dbConnection.execute(
          sql,
          [artistName, trackName, JSON.stringify(npData)],
        );

        if (rows.insertId) {
          d('saved to db');

          const ytVideoKey = await getYtVideoIdFromDB(artistName, trackName);

          let emo = '';
          switch (artistName) {
            case 'Radiohead':
              switch (trackName) {
                case 'Pyramid Song':
                  emo = '🔺🎶';
                  break;
                case 'Kid A':
                  emo = '👶🅰️';
                  break;
                case '2 + 2 = 5':
                  emo = '✌️+✌️=🖐️';
                  break;
              }
              break;
            case 'AC/DC':
              emo = '⚡';
              break;
          }

          const today = new Date();
          if (today.getMonth() === 3 && today.getDate() === 1) {
            if (artistName.includes('Love') || trackName.includes('Love')) {
              artistName = artistName.replace(/Love/g, 'Lavaş');
              trackName = trackName.replace(/Love/g, 'Lavaş');
              trackName += ' 🌯';
              emo = '🌯';
            }

            if (trackName.includes('Baby')) {
              trackName = trackName.replace(/Baby/g, 'Baboli');
            }

            artistName = artistName.replace(/Garbage/g, 'Garabacı');

            if (artistName.toLowerCase().includes('the smiths')) {
              emo += '🥯';
              artistName = artistName.replace(/the smiths/gi, 'The Simits');
            }
          }

          let text = `${artistName} - ${trackName}`;
          if (emo) {
            text = `${emo} ${text}`;
          }
          text += ' #radyoeksen';

          await postToBsky(artistName, trackName, text, ytVideoKey);
        }
      }
    }
  } catch (error) {
    d('could not get NP data from eksen', error);
  }
};

let bskyAgent = null;
const getBskyAgent = async () => {
  if (bskyAgent === null) {
    bskyAgent = new AtpAgent({
      service: 'https://bsky.social',
    });

    try {
      await bskyAgent.login({
        identifier: process.env.BSKY_IDENTIFIER,
        password: process.env.BSKY_PASS,
      });
    } catch (error) {
      bskyAgent = null;
    }
  }

  return bskyAgent;
};

const postToBsky = async (artistName, trackName, text = null, videoSrcKey = null) => {
  const agent = await getBskyAgent();
  if (agent === null) {
    d('Could not get Bsky agent');
    return;
  }

  let embedData = null;

  if (videoSrcKey) {
    const ytUrl = `https://www.youtube.com/watch?v=${videoSrcKey}`;
    const ytThumbnailImgUrls = [
      `https://img.youtube.com/vi/${videoSrcKey}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${videoSrcKey}/hqdefault.jpg`
    ];
    let thumbnailResponse = false;
    for (const ytThumbnailImgUrl of ytThumbnailImgUrls) {
      try {
        thumbnailResponse = await axios.get(ytThumbnailImgUrl, {responseType: 'arraybuffer'});
        if (thumbnailResponse) {
          break;
        }
      } catch (error) {
        //
      }
    }
    if (thumbnailResponse) {
      try {
        const uint8Array = new Uint8Array(thumbnailResponse.data);
        const thumbnailUploadResponse = await agent.uploadBlob(uint8Array, {encoding: 'image/jpeg'});

        embedData = {
          $type: 'app.bsky.embed.external',
          external: {
            uri: ytUrl,
            title: trackName,
            description: artistName,
            thumb: thumbnailUploadResponse.data.blob,
          },
        };
      } catch (error) {
        console.log(`Error fetching thumbnail img: ${videoSrcKey}`, error.message);
      }
    } else {
      console.log(`Could not fetch thumbnail img: ${videoSrcKey}`);
    }
  }

  if (!text) text = `${artistName} - ${trackName}`;
  const rt = new RichText({
    text: text,
  });

  await rt.detectFacets(agent);

  const postData = {
    text: rt.text,
    facets: rt.facets,
    createdAt: new Date().toISOString(),
  };
  if (embedData) {
    postData['embed'] = embedData;
  }
  await agent.post(postData);
};

export {
  getDbConnection,
  getLastEksenRowFromDB,
  getYtVideoIdFromDB,
  checkAndPost,
  postToBsky,
};

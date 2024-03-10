require('dotenv').config({path: __dirname + '/.env'});
const {BskyAgent, RichText} = require('@atproto/api');
const axios = require('axios');
const dotenv = require('dotenv');
const {createConnection} = require('mysql2/promise');

let dbConnection = null;

const propositionCase = (str) => {
  const smalls = ['a', 'and', 'is', 'of', 'on', 'in', 'at', 'the', 'by'];

  smalls.forEach((small) => {
    const pattern = new RegExp(`\\b(?!^)${small}\\b`, 'gi');
    str = str.replace(pattern, small);
  });

  return str;
};

const toTitleCase = (str) => {
  return str.split(' ').map((s) => {
    s = s.toLocaleLowerCase();
    return s[0].toLocaleUpperCase() + s.slice(1);
  }).join(' ');
};

const getLastEksenRowFromDB = async () => {
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

(async () => {
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
        console.log('No data');
        process.exit();
      }

      dbConnection = await createConnection({
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
      });

      trackName = trackName.replace('_', ' ');
      trackName = toTitleCase(trackName);
      trackName = propositionCase(trackName);

      artistName = artistName.replace('_', ' ');
      artistName = toTitleCase(artistName);
      artistName = propositionCase(artistName);

      if (artistName.toLowerCase() == 'reklam' || trackName.toLowerCase() == 'reklam') {
        console.log('ads - pass');
        process.exit();
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
          console.log('saved to db');

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
    console.log('could not get NP data from eksen', error);
  }
  process.exit();
})();

const postToBsky = async (artistName, trackName, text = null, videoSrcKey = null) => {
  dotenv.config();
  const agent = new BskyAgent({
    service: 'https://bsky.social',
  });

  await agent.login({
    identifier: process.env.BSKY_IDENTIFIER,
    password: process.env.BSKY_PASS,
  });

  let embedData = null;

  if (videoSrcKey) {
    const ytUrl = `https://www.youtube.com/watch?v=${videoSrcKey}`;
    const ytThumbnailImgUrl = `https://img.youtube.com/vi/${videoSrcKey}/maxresdefault.jpg`;
    try {
      const thumbnailResponse = await axios.get(ytThumbnailImgUrl, {responseType: 'arraybuffer'});
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
      console.error('Error fetching thumbnail img: ', error.message);
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

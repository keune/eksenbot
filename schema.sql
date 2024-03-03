CREATE TABLE IF NOT EXISTS `eksen` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `artistName` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `trackName` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `responseTxt` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `responseTxt` (`responseTxt`(255)),
  KEY `trackNameArtistName` (`trackName`,`artistName`),
  KEY `created` (`created`)
) ENGINE=InnoDB AUTO_INCREMENT=939898 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `youtube` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `artistName` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `trackName` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `youtubeVideoId` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `isCorrect` tinyint(4) unsigned DEFAULT '0',
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `artistName` (`artistName`),
  KEY `isCorrect` (`isCorrect`),
  KEY `trackName` (`trackName`)
) ENGINE=InnoDB AUTO_INCREMENT=14628 DEFAULT CHARSET=utf8;

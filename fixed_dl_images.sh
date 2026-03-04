#!/bin/bash

mkdir -p images
echo Downloading Sesame_Street_premiere_1969.jpg to images/1970/Sesame_Street_premiere_1969.jpg
mkdir -p images/1970
curl -L -o "images/1970/Sesame_Street_premiere_1969.jpg" "https://commons.wikimedia.org/wiki/Special:FilePath/Sesame_Street_premiere_1969.jpg"
if [ $? -eq 0 ]; then
  echo ✅ Downloaded: Sesame_Street_premiere_1969.jpg
else
  echo ❌ Failed to download: Sesame_Street_premiere_1969.jpg
fi

echo Downloading Pong_arcade_game.jpg to images/1972/Pong_arcade_game.jpg
mkdir -p images/1972
curl -L -o "images/1972/Pong_arcade_game.jpg" "https://commons.wikimedia.org/wiki/Special:FilePath/Pong_arcade_game.jpg"
if [ $? -eq 0 ]; then
  echo ✅ Downloaded: Pong_arcade_game.jpg
else
  echo ❌ Failed to download: Pong_arcade_game.jpg
fi

echo Downloading Star_Wars_1977_US_poster.jpg to images/1977/Star_Wars_1977_US_poster.jpg
mkdir -p images/1977
curl -L -o "images/1977/Star_Wars_1977_US_poster.jpg" "https://commons.wikimedia.org/wiki/Special:FilePath/Star_Wars_1977_US_poster.jpg"
if [ $? -eq 0 ]; then
  echo ✅ Downloaded: Star_Wars_1977_US_poster.jpg
else
  echo ❌ Failed to download: Star_Wars_1977_US_poster.jpg
fi

echo Downloading Garfield_first_comic_strip.jpg to images/1978/Garfield_first_comic_strip.jpg
mkdir -p images/1978
curl -L -o "images/1978/Garfield_first_comic_strip.jpg" "https://commons.wikimedia.org/wiki/Special:FilePath/Garfield_first_comic_strip.jpg"
if [ $? -eq 0 ]; then
  echo ✅ Downloaded: Garfield_first_comic_strip.jpg
else
  echo ❌ Failed to download: Garfield_first_comic_strip.jpg
fi

echo Downloading Sony-Walkman-TPS-L2.jpg to images/1979/Sony-Walkman-TPS-L2.jpg
mkdir -p images/1979
curl -L -o "images/1979/Sony-Walkman-TPS-L2.jpg" "https://commons.wikimedia.org/wiki/Special:FilePath/Sony-Walkman-TPS-L2.jpg"
if [ $? -eq 0 ]; then
  echo ✅ Downloaded: Sony-Walkman-TPS-L2.jpg
else
  echo ❌ Failed to download: Sony-Walkman-TPS-L2.jpg
fi

echo Downloading Pacman.png to images/1980/Pacman.png
mkdir -p images/1980
curl -L -o "images/1980/Pacman.png" "https://commons.wikimedia.org/wiki/Special:FilePath/Pacman.png"
if [ $? -eq 0 ]; then
  echo ✅ Downloaded: Pacman.png
else
  echo ❌ Failed to download: Pacman.png
fi

echo Downloading Sony_CD_player_1982.jpg to images/1982/Sony_CD_player_1982.jpg
mkdir -p images/1982
curl -L -o "images/1982/Sony_CD_player_1982.jpg" "https://commons.wikimedia.org/wiki/Special:FilePath/Sony_CD_player_1982.jpg"
if [ $? -eq 0 ]; then
  echo ✅ Downloaded: Sony_CD_player_1982.jpg
else
  echo ❌ Failed to download: Sony_CD_player_1982.jpg
fi

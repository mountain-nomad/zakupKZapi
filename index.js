const express = require('express');
const app = express();
require('dotenv').config();
const cheerio = require('cheerio');
const { default: axios } = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const port = process.env.PORT || 5000;

let zakup = [];

// Load data from file
const loadZakupFromFile = () => {
  try {
    const data = fs.readFileSync('zakup.json', 'utf8');
    zakup = JSON.parse(data);
  } catch (err) {
    console.log('No previous data found, starting fresh.');
  }
};

// Save data to file
const saveZakupToFile = () => {
  fs.writeFileSync('zakup.json', JSON.stringify(zakup, null, 2), 'utf8');
};

const fetchZakup = async (link) => {
  try {
    let { data } = await axios.get(link);
    let $ = cheerio.load(data);

    for (let i = 1; i <= 50; i++) {
      const id = "https://www.goszakup.gov.kz/" + $(`#search-result > tbody > tr:nth-child(${i}) > td:nth-child(2) > a`).attr('href');
      const number = $(`#search-result > tbody > tr:nth-child(${i}) > td:nth-child(1) > strong`).text().trim();
      const title = $(`#search-result > tbody > tr:nth-child(${i}) > td:nth-child(2) > a`).text().trim();
      const organizer = $(`#search-result > tbody > tr:nth-child(${i}) > td:nth-child(2) > small`).text().trim();
      const method = $(`#search-result > tbody > tr:nth-child(${i}) > td:nth-child(3)`).text().trim();
      const begin = $(`#search-result > tbody > tr:nth-child(${i}) > td:nth-child(4)`).text().trim();
      const end = $(`#search-result > tbody > tr:nth-child(${i}) > td:nth-child(5)`).text().trim();
      const sum = $(`#search-result > tbody > tr:nth-child(${i}) > td:nth-child(6)`).text().trim();
      const status = $(`#search-result > tbody > tr:nth-child(${i}) > td:nth-child(7)`).text().trim();

      if (!zakup.some(item => item.id === id)) {
        zakup.push({
          id,
          number,
          title,
          organizer,
          method,
          begin,
          end,
          sum,
          status
        });
      }
    }
  } catch (e) {
    console.log(e);
  }
};

const fetchAllZakup = async () => {
  zakup = []; // Очистка текущих данных перед новым сбором
  for (let i = 1; i <= 10000; i++) {
    const url = `https://www.goszakup.gov.kz/ru/search/announce?count_record=50&page=${i}`;
    await fetchZakup(url);
  }
  saveZakupToFile(); // Сохранение данных в файл
};

// Schedule the fetchAllZakup function to run every 6 hours
cron.schedule('0 */6 * * *', () => {
  console.log('Fetching new data...');
  fetchAllZakup();
});

// Initial fetch when the server starts
loadZakupFromFile(); // Загрузка данных из файла при старте сервера
fetchAllZakup();

app.get("/zakup", (req, res) => {
  res.send(zakup);
});

app.listen(port, () => {
  console.log('Server started on port', port);
});

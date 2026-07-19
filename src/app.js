const express = require('express');
const path = require('path');
const { buildIndex } = require('./indexer');
const { watchReports } = require('./watcher');

const app = express();
const REPORTS_DIR = process.env.REPORTS_DIR || '/reports';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

let reportsIndex = buildIndex(REPORTS_DIR);

const watcher = watchReports(REPORTS_DIR, () => {
  reportsIndex = buildIndex(REPORTS_DIR);
});

app.locals.getIndex = () => reportsIndex;
app.locals.watcher = watcher;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', reportCount: reportsIndex.length });
});

app.use('/', require('./routes/index'));
app.use('/', require('./routes/reports'));

app.use(express.static(path.join(__dirname, '..', 'public')));

module.exports = app;

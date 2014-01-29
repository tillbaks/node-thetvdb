/* jshint node: true */
'use strict';

var util = require('util');
var fs = require('fs');

var unzip = require('unzip');
var request = require('request');
var parser = require('xml2json');

// * DEFAULTS

var apiKey = '';
var language = 'en';
var mirror = 'http://www.thetvdb.com';
var parserOpts = {
	object: true,
	reversible: false,
	sanitize: true,
	coerce: true,
	trim: false,
	arrayNotation: false
};

// * PRIVATE FUNCTONS

// Turns XML to JS (also removes unnessesary stuff)
var parseXml = function (xml, callback) {
	var keys;
	var js = parser.toJson(xml, parserOpts);

	if (js.Error) {

		callback(js.Error, null);
		return;
	}
	keys = Object.keys(js);
	if (keys.length === 1) {
		// Not sure if removing all keys[0] if length is 1 is a good idea, so starting with Data and Items..
		if (keys[0] === 'Data') {
			js = js.Data;
		}
		else if (keys[0] === 'Items') {
			js = js.Items;
		}
	}
	callback(err, js);
};

// Downloads a xml file and returns it as a JS object
var getXmlAsJS = function (file_url, callback) {
	console.log(file_url);
	request(file_url, function (err, res, body) {
		if (err || res.statusCode !== 200) {
			callback(err, null);
			return;
		}
		parseXml(body, callback);
	});
};

// Downloads a zip file and extracts all xml files inside and returns it as a JS object
var getZippedXmlAsJS = function (file_url, callback) {
	console.log(file_url);
	var result_data = {};
	request(file_url)
		.pipe(unzip.Parse())
		.on('entry', function (entry) {
			var xmldata = '';
			entry.on('data', function (data) {
				xmldata += data.toString();
			});
			entry.on('end', function () {

				parseXml(xmldata, function (err, data) {
					if (err) {
						callback(err, null);
						return;
					}
					Object.keys(data).forEach(function (dataType) {
						result_data[dataType] = data[dataType];
					});
				})
			});
		})
		.on('close', function () {

			callback(null, result_data);
		});
};

// Downloads a file
var downloadFile = function (file_url, filename, callback) {

	request(file_url)
		.pipe(fs.createWriteStream(filename))
		.on('error', callback)
		.on('close', callback);
};

// * PUBLIC FUNCTIONS

exports.apiKey = function (data) {
	if (typeof data === 'function') {
		data(apiKey);
	}
	else { 
		apiKey = data;
	}
	return this;
};

exports.language = function (data) {
	if (typeof data === 'function') {
		data(language);
	}
	else { 
		language = data;
	}
	return this;
};

exports.mirror = function (data) {
	if (typeof data === 'function') {
		data(mirror);
	}
	else { 
		mirror = data;
	}
	return this;
};

exports.parserOpts = function (data) {
	if (typeof data === 'function') {
		data(parserOpts);
	}
	else { 
		parserOpts = data;
	}
	return this;
};

// API URL: <mirror>/api/<apikey>/languages.xml
// Returns: Languages
exports.getLanguages = function (callback) {

	getXmlAsJS(
		util.format('%s/api/%s/languages.xml', mirror, apiKey),
		callback
	);
	return this;
};

// API URL: <mirror>/api/Updates.php?type=none
// Returns: Time
exports.getTime = function (callback) {

	getXmlAsJS(
		util.format('%s/api/Updates.php?type=none', mirror),
		callback
	);
	return this;
};

// API URL: <mirror>/api/<apikey>/updates/updates_<timeframe>.zip
// Returns: time, [Series], [Episode], [Banner]
exports.getUpdates = function (timeframe, callback) {

	// timeframe can only be day, week, month or all (default: day)
	timeframe = {day: 'day', week: 'week', month: 'month', all: 'all'}[timeframe] || 'day';

	getZippedXmlAsJS(
		util.format('%s/api/%s/updates/updates_%s.zip', mirror, apiKey, timeframe),
		callback
	);
	return this;
};

// API URL: <mirror>/api/GetSeries.php?seriesname=<seriesname>
// Returns [Series]
exports.getSeries = function (series_name, callback) {

	getXmlAsJS(
		util.format('%s/api/GetSeries.php?seriesname=%s', mirror, series_name),
		callback
	);
	return this;
};

// API URL: <mirror>/api/<apikey>/series/<seriesid>/<language>.xml
// Returns: Series
exports.getSeriesById = function (series_id, callback) {

	getXmlAsJS(
		util.format('%s/api/%s/series/%s/%s.xml', mirror, apiKey, series_id, language),
		callback
	);
	return this;
};

// API URL: <mirror>/api/<apikey>/series/<seriesid>/all/<language>.zip
// Returns: Series, [Episode], [Actor], [Banner]
exports.getSeriesAllById = function (series_id, callback) {

	getZippedXmlAsJS(
		util.format('%s/api/%s/series/%s/all/%s.zip', mirror, apiKey, series_id, language),
		callback
	);
	return this;
};

// API URL: <mirror>/api/<apikey>/episodes/<episodeid>/<language>.xml
// Returns: Episode
exports.getEpisodeById = function (episode_id, callback) {

	getXmlAsJS(
		util.format('%s/api/%s/episodes/%s/%s.xml', mirror, apiKey, episode_id, language),
		callback
	);
	return this;
};

// API URL: <mirror>/api/<apikey>/series/<seriesid>/default/<season#>/<episode#>/<language>.xml
// Returns: Episode
exports.getEpisodeByAirDate = function (series_id, season_num, episode_num, callback) {

	getXmlAsJS(
		util.format('%s/api/%s/series/%s/default/%s/%s/%s.xml', mirror, apiKey, series_id, season_num, episode_num, language),
		callback
	);
	return this;
};

// API URL: <mirror>/api/<apikey>/series/<seriesid>/dvd/<season#>/<episode#>/<language>.xml
// Returns: Episode
exports.getEpisodeByDVD = function (series_id, season_num, episode_num, callback) {

	getXmlAsJS(
		util.format('%s/api/%s/series/%s/dvd/%s/%s/%s.xml', mirror, apiKey, series_id, season_num, episode_num, language),
		callback
	);
	return this;
};

// API URL: <mirror>/api/<apikey>/series/<seriesid>/absolute/<absolute#>/<language>.xml
// Returns: Episode
exports.getEpisodeByAbsolute = function (series_id, absolute_num, callback) {

	getXmlAsJS(
		util.format('%s/api/%s/series/%s/default/%s/%s.xml', mirror, apiKey, series_id, absolute_num, language),
		callback
	);
	return this;
};

// API URL: <mirror>/api/<apikey>/series/<seriesid>/actors.xml
// Returns: [Actor]
exports.getActors = function (series_id, callback) {

	getXmlAsJS(
		util.format('%s/api/%s/series/%s/actors.xml', mirror, apiKey, series_id),
		callback
	);
	return this;
};

// API URL: <mirror>/api/<apikey>/series/<seriesid>/banners.xml
// Returns: [Banner]
exports.getBanners = function (series_id, callback) {

	getXmlAsJS(
		util.format('%s/api/%s/series/%s/banners.xml', mirror, apiKey, series_id),
		callback
	);
	return this;
};

// API URL: <mirror>/banners/<filename>
// Downloads: Banner
exports.downloadBanner = function (banner, filename, callback) {

	downloadFile(
		util.format('%s/banners/%s', mirror, banner),
		filename,
		callback
	);
	return this;
};
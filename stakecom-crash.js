// ==UserScript==
// @name         Stake.com Crash Bot
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  shows how to use babel compiler
// @author       You
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/6.18.2/babel.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/6.16.0/polyfill.js
// @match        https://stake.bet/*
// @match        https://stake.com/casino/games/crash
// @icon         <$ICON$>
// ==/UserScript==

/* jshint ignore:start */
var inline_src = (<><![CDATA[
/* jshint ignore:end */

	const singleBet = 100; //100 usd
	const singleMultiplier = 1.08;

	///
	/// helpers
	///

	function error(msg1, msg2, msg3) {
		if (msg1 !== undefined && msg2 !== undefined && msg3 !== undefined) console.error("XXX", msg1, msg2, msg3);
		else if (msg1 !== undefined && msg2 !== undefined) console.error("XXX", msg1, msg2);
		else console.error("XXX", msg1);
	}

	function log(msg1, msg2, msg3) {
		if (msg1 !== undefined && msg2 !== undefined && msg3 !== undefined) console.log("XXX", msg1, msg2, msg3);
		else if (msg1 !== undefined && msg2 !== undefined) console.log("XXX", msg1, msg2);
		else console.log("XXX", msg1);
	}

	function debug(msg1, msg2, msg3) {
		if (msg1 !== undefined && msg2 !== undefined && msg3 !== undefined) console.debug("XXX", msg1, msg2, msg3);
		else if (msg1 !== undefined && msg2 !== undefined) console.debug("XXX", msg1, msg2);
		else console.debug("XXX", msg1);
	}

	function makeEnum(arr) {
		let obj = {};
		for (let val of arr) {
			obj[val] = Symbol(val);
		}
		return Object.freeze(obj);
	}

	function uuidv4() {
		return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
		);
	}

	function localStorageSet(key, val) {
		const prepared = JSON.stringify([val]);
		localStorage.setItem(key, prepared);
	}

	function localStorageGet(key, defaultValue) {
		const data = localStorage.getItem(key);
		return data ? JSON.parse(data)[0] : defaultValue;
	}

	function avg(arr) {
		const sum = arr.reduce((acc, cur) => acc + cur);
		const average = sum/arr.length;
		return average;
	}

	function wait(delay) {
		return new Promise((resolve) => setTimeout(resolve, delay));
	}

	function fetchRetry(url, delay, tries, dataCheckFunction = null, fetchOptions = {}) {
		function onError(err) {
			let triesLeft = tries - 1;
			if (!triesLeft) throw err;

			return wait(delay).then(() => fetchRetry(url, delay, triesLeft, dataCheckFunction, fetchOptions));
		}

		return fetch(url, fetchOptions).catch(onError).then(response => response.json())
			.then(data => {
				if (!dataCheckFunction) return data;

				try {
					if (!dataCheckFunction(data)) return onError(new Error("Response not valid"));
					else return data;
				} catch (e) {
					return onError(e);
				}
			});
	}

	function arrayEquals(a, b) {
		if (a === b) return true;
		if (a == null || b == null) return false;
		if (a.length !== b.length) return false;

		// If you don't care about the order of the elements inside
		// the array, you should sort both arrays here.
		// Please note that calling sort on an array will modify that array.
		// you might want to clone your array first.

		for (var i = 0; i < a.length; ++i) {
			if (a[i] !== b[i]) return false;
		}
		return true;
	}


	///
	/// graphql
	///

	async function fetchCurrencies() {
		const response = await fetchRetry("https://api.stake.com/graphql", 500, 5, res => res.data.info.currencies, {
			"headers": {
				"accept": "*/*",
				"accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
				// "cf-ipcountry": "CZ",
				"cloudfront-is-mobile-viewer": "",
				"cloudfront-viewer-country": "",
				"content-type": "application/json",
				"sec-ch-ua": "\".Not/A)Brand\";v=\"99\", \"Google Chrome\";v=\"103\", \"Chromium\";v=\"103\"",
				"sec-ch-ua-mobile": "?0",
				// "sec-ch-ua-platform": "\"macOS\"",
				"sec-fetch-dest": "empty",
				"sec-fetch-mode": "cors",
				"sec-fetch-site": "same-site",
				// "x-access-token": "b45bdc6434a740a676639860e68b72f422155872894bdb45698f2c770939f2ef5093c967be74b57427816df3bbae73d7",
				"x-forwarded-for": "94.113.137.160, 141.101.96.220, 172.20.224.144",
				"x-language": "en"
			},
			"referrer": "https://stake.com/",
			"referrerPolicy": "strict-origin-when-cross-origin",
			"body": "{\"query\":\"query CurrencyConversionRate {\\n  info {\\n    currencies {\\n      name\\n      eur: value(fiatCurrency: eur)\\n      jpy: value(fiatCurrency: jpy)\\n      usd: value(fiatCurrency: usd)\\n      brl: value(fiatCurrency: brl)\\n      cad: value(fiatCurrency: cad)\\n      cny: value(fiatCurrency: cny)\\n      idr: value(fiatCurrency: idr)\\n      inr: value(fiatCurrency: inr)\\n      krw: value(fiatCurrency: krw)\\n      php: value(fiatCurrency: php)\\n      rub: value(fiatCurrency: rub)\\n      mxn: value(fiatCurrency: mxn)\\n      dkk: value(fiatCurrency: dkk)\\n    }\\n  }\\n}\\n\",\"variables\":{}}",
			"method": "POST",
			"mode": "cors",
			"credentials": "omit"
		});
		return response.data.info.currencies;
	}

	async function fetchGameListHistoryStart() {
		const response = await fetchRetry("https://api.stake.com/graphql", 500, 5, res => res.data.crashGameList && res.data.crashGame, {
			"headers": {
				"accept": "*/*",
				"accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
				"content-type": "application/json",
				"sec-ch-ua": "\".Not/A)Brand\";v=\"99\", \"Google Chrome\";v=\"103\", \"Chromium\";v=\"103\"",
				"sec-ch-ua-mobile": "?0",
				// "sec-ch-ua-platform": "\"macOS\"",
				"sec-fetch-dest": "empty",
				"sec-fetch-mode": "cors",
				"sec-fetch-site": "same-site",
				// "x-access-token": "b45bdc6434a740a676639860e68b72f422155872894bdb45698f2c770939f2ef5093c967be74b57427816df3bbae73d7",
				"x-lockdown-token": "s5MNWtjTM5TvCMkAzxov"
			},
			"referrer": "https://stake.com/",
			"referrerPolicy": "strict-origin-when-cross-origin",
			"body": "{\"query\":\"query CrashGameInitAuth {\\n  crashGame {\\n    ...MultiplayerCrash\\n    leaderboard {\\n      ...MultiplayerCrashBet\\n    }\\n  }\\n  crashGameList {\\n    ...MultiplayerCrash\\n  }\\n  user {\\n    id\\n    activeCrashBet {\\n      ...MultiplayerCrashBet\\n    }\\n  }\\n}\\n\\nfragment MultiplayerCrash on MultiplayerCrash {\\n  id\\n  status\\n  multiplier\\n  startTime\\n  nextRoundIn\\n  crashpoint\\n  elapsed\\n  timestamp\\n  cashedIn {\\n    id\\n    user {\\n      id\\n      name\\n    }\\n    payoutMultiplier\\n    gameId\\n    amount\\n    payout\\n    currency\\n    result\\n    updatedAt\\n    cashoutAt\\n    btcAmount: amount(currency: btc)\\n  }\\n  cashedOut {\\n    id\\n    user {\\n      id\\n      name\\n    }\\n    payoutMultiplier\\n    gameId\\n    amount\\n    payout\\n    currency\\n    result\\n    updatedAt\\n    cashoutAt\\n    btcAmount: amount(currency: btc)\\n  }\\n}\\n\\nfragment MultiplayerCrashBet on MultiplayerCrashBet {\\n  id\\n  user {\\n    id\\n    name\\n  }\\n  payoutMultiplier\\n  gameId\\n  amount\\n  payout\\n  currency\\n  result\\n  updatedAt\\n  cashoutAt\\n  btcAmount: amount(currency: btc)\\n}\\n\",\"variables\":{}}",
			"method": "POST",
			"mode": "cors",
			"credentials": "omit"
		});
		return response.data;
	}

	async function fetchGameListHistoryContinue(limit, offset) {
		const response = await fetchRetry("https://api.stake.com/graphql", 500, 5, res => res.data.crashGameList, {
			"headers": {
				"accept": "*/*",
				"accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
				// "cf-ipcountry": "CZ",
				"cloudfront-is-mobile-viewer": "",
				"cloudfront-viewer-country": "",
				"content-type": "application/json",
				"sec-ch-ua": "\".Not/A)Brand\";v=\"99\", \"Google Chrome\";v=\"103\", \"Chromium\";v=\"103\"",
				"sec-ch-ua-mobile": "?0",
				// "sec-ch-ua-platform": "\"macOS\"",
				"sec-fetch-dest": "empty",
				"sec-fetch-mode": "cors",
				"sec-fetch-site": "same-site",
				// "x-access-token": "b45bdc6434a740a676639860e68b72f422155872894bdb45698f2c770939f2ef5093c967be74b57427816df3bbae73d7",
				"x-forwarded-for": "94.113.137.160, 162.158.38.28, 172.20.224.144",
				"x-language": "en",
				"x-lockdown-token": "s5MNWtjTM5TvCMkAzxov"
			},
			"referrer": "https://stake.com/",
			"referrerPolicy": "strict-origin-when-cross-origin",
			"body": "{\"query\":\"query CrashGameListHistory($limit: Int, $offset: Int) {\\n  crashGameList(limit: $limit, offset: $offset) {\\n    id\\n    startTime\\n    crashpoint\\n    hash {\\n      id\\n      hash\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n\",\"operationName\":\"CrashGameListHistory\",\"variables\":{\"limit\":"+limit+",\"offset\":"+offset+"}}",
			"method": "POST",
			"mode": "cors",
			"credentials": "omit"
		});
		return response.data.crashGameList;
	}

	async function fetchGameLookup(gameId) {
		const response = await fetchRetry("https://api.stake.com/graphql", 500, 5, res => res.data.crashGame, {
			"headers": {
				"accept": "*/*",
				"accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
				// "cf-ipcountry": "CZ",
				"cloudfront-is-mobile-viewer": "",
				"cloudfront-viewer-country": "",
				"content-type": "application/json",
				"sec-ch-ua": "\".Not/A)Brand\";v=\"99\", \"Google Chrome\";v=\"103\", \"Chromium\";v=\"103\"",
				"sec-ch-ua-mobile": "?0",
				// "sec-ch-ua-platform": "\"macOS\"",
				"sec-fetch-dest": "empty",
				"sec-fetch-mode": "cors",
				"sec-fetch-site": "same-site",
				// "x-access-token": "b45bdc6434a740a676639860e68b72f422155872894bdb45698f2c770939f2ef5093c967be74b57427816df3bbae73d7",
				"x-forwarded-for": "94.113.137.160, 141.101.96.220, 172.20.224.144",
				"x-language": "en",
				"x-lockdown-token": "s5MNWtjTM5TvCMkAzxov"
			},
			"referrer": "https://stake.com/",
			"referrerPolicy": "strict-origin-when-cross-origin",
			"body": "{\"query\":\"query CrashGameLookup($gameId: String!) {\\n  crashGame(gameId: $gameId) {\\n    seed {\\n      id\\n      seed\\n      __typename\\n    }\\n    hash {\\n      id\\n      hash\\n      number\\n      __typename\\n    }\\n    ...MultiplayerCrash\\n    leaderboard {\\n      ...MultiplayerCrashBet\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n\\nfragment MultiplayerCrash on MultiplayerCrash {\\n  id\\n  status\\n  multiplier\\n  startTime\\n  nextRoundIn\\n  crashpoint\\n  elapsed\\n  timestamp\\n  cashedIn {\\n    id\\n    user {\\n      id\\n      name\\n      __typename\\n    }\\n    payoutMultiplier\\n    gameId\\n    amount\\n    payout\\n    currency\\n    result\\n    updatedAt\\n    cashoutAt\\n    btcAmount: amount(currency: btc)\\n    __typename\\n  }\\n  cashedOut {\\n    id\\n    user {\\n      id\\n      name\\n      __typename\\n    }\\n    payoutMultiplier\\n    gameId\\n    amount\\n    payout\\n    currency\\n    result\\n    updatedAt\\n    cashoutAt\\n    btcAmount: amount(currency: btc)\\n    __typename\\n  }\\n}\\n\\nfragment MultiplayerCrashBet on MultiplayerCrashBet {\\n  id\\n  user {\\n    id\\n    name\\n    __typename\\n  }\\n  payoutMultiplier\\n  gameId\\n  amount\\n  payout\\n  currency\\n  result\\n  updatedAt\\n  cashoutAt\\n  btcAmount: amount(currency: btc)\\n}\\n\",\"operationName\":\"CrashGameLookup\",\"variables\":{\"gameId\":\""+gameId+"\"}}",
			"method": "POST",
			"mode": "cors",
			"credentials": "omit"
		});
		return response.data.crashGame;
	}

	///
	/// logic
	///

	async function updateCurrencies() {
		const lastRefresh = localStorageGet("XXX_currencies_valid", null);
		if (lastRefresh && lastRefresh <= new Date().getTime()) return;

		const currencies = await fetchCurrencies();
		localStorageSet("XXX_currencies", currencies);
		localStorageSet("XXX_currencies_valid", new Date().getTime() + 60 * 60 * 1000);
	}

	function getCurrencyUsdWorth(currency) {
		const currencies = localStorageGet("XXX_currencies", [ { name: currency, usd: 0 }]);
		return currencies.filter(i => i.name === currency)[0]["usd"];
	}

	async function getActualGame() {
		let data = await fetchGameListHistoryStart();
		debug("data.crashGame", data.crashGame);

		// update current game
		let game = {};
		game.id = data.crashGame.id;
		game.startTime = new Date(data.crashGame.startTime);
		game.status = data.crashGame.status;

		let maxBet = 0;
		let allBets = [];

		let leaderDtos = [];
		for (let j = 0; j < data.crashGame.leaderboard.length; j++) {
			const leader = data.crashGame.leaderboard[j];
			const amountInUsd = leader.btcAmount * getCurrencyUsdWorth("btc");

			let leaderDto = {};
			leaderDto.id = leader.id;
			leaderDto.cashoutAt = leader.cashoutAt;
			leaderDto.amountInUsd = leader.btcAmount * getCurrencyUsdWorth("btc");
			leaderDtos.push(leaderDto);

			if (amountInUsd > maxBet) maxBet = amountInUsd;
			if (amountInUsd > 0) allBets.push(amountInUsd);
		}

		game.maxBet = maxBet;
		game.avgBet = allBets.lenght > 0 ? avg(allBets) : 0;
		game.leaderDtos = leaderDtos;
		return game;
	}

	function readBalance() {
		const usdtButtons = document.querySelectorAll('[data-active-currency="usdt"]');
		if (usdtButtons.length == 0) throw new Error("Select USDT first");

		return parseFloat(usdtButtons[0].textContent.split("$")[1]);
	}

	function switchToUsdt() {
		if (document.querySelectorAll('[data-active-currency="usdt"]').length > 0) {
			log("USDT already set");
		} else {
			log("Switching to USDT");
			const currencyButton = document.querySelectorAll('[data-test="coin-toggle"]')[0];
			setTimeout(() => document.querySelectorAll('[data-test="coin-toggle-currency-usdt"]')[0].click(), 300);
			currencyButton.click();
		}
	}

	function setBets() {
		document.querySelectorAll('[data-test="input-game-amount"]')[0].value = singleBet;
		document.getElementsByClassName("input spacing-expanded input-icon-after svelte-1a6ivfd")[1].value = singleMultiplier;
	}

	function play() {
		document.querySelectorAll('[data-test="bet-button"]')[0].click();
	}

	const Status = makeEnum(["in_progress", "starting", "ended", "pending"]);

	// FIXME there is also ended state which is when multiplier is in red
	function getCurrentStatus() {
		const statusLine = document.getElementsByClassName("svelte-nc3u35")[0].textContent;
		// new bets before play
		if (statusLine.indexOf("Next round in") > -1) return Status.starting;
		// starting new round
		else if (statusLine.indexOf("Starting...") > -1) return Status.pending;
		// playing
		else return Status.in_progress;
	}

	function getTimeToNextPlay() {
		if (getCurrentStatus() !== Status.starting) return -1;

		const statusLine = document.getElementsByClassName("svelte-nc3u35")[0].textContent;
		return parseFloat(statusLine.split(":")[1].split("s")[0]);
	}

	function readCurrentEndedGames() {
		let endedGames = document.getElementsByClassName("past-bets svelte-13yy8ol")[0].children;
		let gameMultipliers = [];
		for (let i = 0; i < endedGames.length - 1; i++) {
			let mult = endedGames[i].textContent;
			gameMultipliers.push(parseFloat(mult.split("x")[0]));
		}
		return gameMultipliers;
	}


	async function main() {
		// set things on the beginning after login
		await updateCurrencies();
		setInterval(async () => await updateCurrencies(), 60 * 60 * 1000);
		switchToUsdt();

		log("Starting event loop");

		let inProgressGame = await getActualGame();
		let gameId = inProgressGame.id;
		let completedGame = inProgressGame;
		let completedGames = [];

		let startingGameSet = false;
		let inProgressGameSet = false;
		let multipliers = readCurrentEndedGames();

		setInterval(async () => {
			try {
				debug(`Next check...`);
				const status = getCurrentStatus();
				let actualMultipliers = readCurrentEndedGames();
				let actualMultiplier = actualMultipliers[0];

				if (status === Status.starting) {
					const timeToPlay = getTimeToNextPlay();
					if (!startingGameSet) {
						let g = await getActualGame();
						gameId = g.id;
						startingGameSet = true;
					}

					// fetch actual game to see its id and need to wait until all leaders will place bets to read them
					log(`${gameId} status: ${status.toString()}, time to play: ${timeToPlay}s`);
					inProgressGameSet = false;
				} else if (status === Status.in_progress) {
					// remember in progress game to read all bets once it appears in progress
					if (!inProgressGameSet) {
						inProgressGame = await getActualGame();
						gameId = inProgressGame.id;
						inProgressGameSet = true;
					}

					// game still in play
					if (arrayEquals(actualMultipliers, multipliers)) {
						log(`${gameId} status: ${status.toString()} playing`);
					}
				} else {
					if (!startingGameSet) {
						let g = await getActualGame();
						gameId = g.id;
						startingGameSet = true;
					}
					inProgressGameSet = false;

					log(`${gameId} status: ${status.toString()}`);
				}

				// game ended
				if (!arrayEquals(actualMultipliers, multipliers)) {
					completedGame = inProgressGame;

					let pot = 0;
					let paid = 0;

					for (let j = 0; j < completedGame.leaderDtos.length; j++) {
						const leader = completedGame.leaderDtos[j];
						if (leader.cashoutAt > actualMultiplier) {
							pot += leader.amountInUsd;
						} else {
							paid += leader.amountInUsd;
						}
					}

					completedGame.pot = pot;
					completedGame.paid = paid;
					completedGame.multiplier = actualMultiplier;

					// remember completed game
					completedGames = [completedGame].concat(completedGames);
					completedGames = completedGames.slice(0, Math.min(10, completedGames.length));

					let potSum = 0;
					let paidSum = 0;
					completedGames.forEach(game => {
						potSum += game.pot;
						paidSum += game.paid;
					});

					multipliers = actualMultipliers;
					log(`${completedGame.id} status: Symbol(ended) ended with multiplier: ${actualMultiplier}\npot actual:    ${pot}\npot 10 games:  ${potSum}\npaid actual:   ${paid}\npaid 10 games: ${paidSum}\n`);

					startingGameSet = false;
				}

			} catch (e) {
				error("Unknown error during event loop", "" + e);
			}
		}, 1000);
	}

	log("Bot started");
	// FIXME wait until page loaded
	setTimeout(async () => main(), 1000);

/* jshint ignore:start */
]]></>).toString();
var c = Babel.transform(inline_src, { presets: [ "es2015", "es2016" ] });
eval(c.code);
/* jshint ignore:end */
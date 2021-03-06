/**
 * @module jseLoader
 * @description This is the publisher mining code and functionality run on visitors devices
 * @example uglifyjs loader.js -c -o loader.min.js
 */

var JSE = (function () {

	var jseTestNet = false; //'remote';
	var jseTrack = {};
	var ts = new Date().getTime();
	var lastRequestTime = 0;

	var jseLoadServer = 'https://load.jsecoin.com:443';

	if (jseTestNet == 'local') {
		jseLoadServer = 'http://localhost:81';
	}
	if (jseTestNet == 'remote') {
		jseLoadServer = 'https://testnet.jsecoin.com:443';
	}

	jseTrack.pubID = 'unknownpubid';
	jseTrack.siteID = 'unknownsiteid';
	jseTrack.subID = 'unknownsubid';
	jseTrack.userIP = 'unknownuserip';
	jseTrack.geo = 'unknowngeo';

	jseTrack.url = window.location.href;
	jseTrack.userAgent = navigator.userAgent || 0;
	jseTrack.platform = navigator.platform || 0;
	jseTrack.referrer = document.referrer || 0;

	jseTrack.language = window.navigator.language || 0;
	if (navigator.languages) { 
		jseTrack.languages = navigator.languages.join('') || 0;
	} else {
		jseTrack.languages = 1;
	}
	jseTrack.timezoneOffset = new Date().getTimezoneOffset() || 0;
	jseTrack.appName = window.navigator.appName || 0;
	jseTrack.screen = window.screen.width+'x'+window.screen.height+'x'+screen.colorDepth || 0;
	jseTrack.deviceMemory = navigator.deviceMemory || navigator.hardwareConcurrency || 0;
	jseTrack.protoString = Object.keys(navigator.__proto__).join('').substring(0, 100) || 0;

	if (window.frameElement == null) {
		jseTrack.iFrame = false;
	} else {
		jseTrack.iFrame = true;
	}

	var sessionHashes = 0;
	var preHash = '0';
	var hashRate = 500;
	var hps = 500;
	var maxHashRate = hashRate;

	function shuffle(arrayRaw) {
		var array = arrayRaw;
		var counter = array.length;
		var temp;
		var index;
		while (counter > 0) {
				index = Math.floor(Math.random() * counter);
				counter-=1;
				temp = array[counter];
				array[counter] = array[index];
				array[index] = temp;
		}
		return array;
	}

	/**
	 * @method <h2>randString</h2>
	 * @description Provides a random string of n length
	 * @param {string} length length of random string to return
	 * @returns {string} retuns a random alphanumeric string
	 */
	function randString(length) {
		var chars = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','A','B','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
		var randStringOut = shuffle(chars).join('').slice(0,length);
		return randStringOut;
	}

	/**
	 * @method <h2>setupHit</h2>
	 * @description Sets visitor data to log a hit or impression
	 */
	function setupHit() {
		if (localStorage) {
			var jseFirstVisit = localStorage.jseFirstVisit; 
		}

		if (typeof jseFirstVisit !== 'undefined' && ts < (Number(jseFirstVisit) + 86400000)) {
		//if (typeof localStorage.jseFirstVisit !== 'undefined' && localStorage.jseFirstVisit < (ts + 86400000)) { //24hrs
			// Just register another hit
			jseTrack['uniq'] = localStorage.jseTrackuniq;
			jseTrack['hits'] = localStorage.jseTrackhits;
			jseTrack['hits'] = parseInt(jseTrack['hits']) + 1;
			localStorage.setItem('jseTrackhits', jseTrack['hits']);
			jseTrack.sendHit = 1;
			// Send hit data
			return jseTrack;
		} else {
			// Log new session (this includes new uniq)
			jseTrack['firstvisit'] = ts;
			jseTrack['uniq'] = randString(20);
			jseTrack['hits'] = 1;

			if (localStorage) {
				localStorage.setItem('jseFirstVisit', String(ts));
				localStorage.setItem('jseTrackuniq', jseTrack['uniq']);
				localStorage.setItem('jseTrackhits', jseTrack['hits']);
			}

			// Send first hit data
			return jseTrack;
		}
	}
	var jseTrackImpression = setupHit();

	/**
	 * @method <h2>fallbackSHA256</h2>
	 * @description Fallback SHA256 function for chrome browsers on sites with no https
	 * @param {string} s string to be hashed
	 * @param {nonce} nonce to be added to string for hashing
	 * @param {function} callback callback function
	 */
	function fallbackSHA256(s, nonce, callback) {
		function safe_add(x, y) { var lsw = (65535 & x) + (65535 & y); return (x >> 16) + (y >> 16) + (lsw >> 16) << 16 | 65535 & lsw }
		function S(X, n) { return X >>> n | X << 32 - n }
		function R(X, n) { return X >>> n }
		function Ch(x, y, z) { return x & y ^ ~x & z }
		function Maj(x, y, z) { return x & y ^ x & z ^ y & z }
		function Sigma0256(x) { return S(x, 2) ^ S(x, 13) ^ S(x, 22) }
		function Sigma1256(x) { return S(x, 6) ^ S(x, 11) ^ S(x, 25) }
		function Gamma0256(x) { return S(x, 7) ^ S(x, 18) ^ R(x, 3) }
		function Gamma1256(x) { return S(x, 17) ^ S(x, 19) ^ R(x, 10) }
		var chrsize = 8, hexcase = 0;
		callback(function(binarray) {
			for (var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef", str = "", i = 0; i < 4 * binarray.length; i++) str += hex_tab.charAt(binarray[i >> 2] >> chrsize * (3 - i % 4) + 4 & 15) + hex_tab.charAt(binarray[i >> 2] >> chrsize * ( 3 - i % 4) & 15);
			return str;
		}(function(m, l) {
			var a, b, c, d, e, f, g, h, T1, T2, K = new Array(1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298),
			HASH = new Array(1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225),
			W = new Array(64);
			m[l >> 5] |= 128 << 24 - l % 32, m[15 + (l + 64 >> 9 << 4)] = l;
			for (var i = 0; i < m.length; i += 16) {
				a = HASH[0], b = HASH[1], c = HASH[2], d = HASH[3], e = HASH[4], f = HASH[5], g = HASH[6], h = HASH[7];
				for (var j = 0; j < 64; j++) W[j] = j < 16 ? m[j + i] : safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16]), T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]),
					T2 = safe_add(Sigma0256(a), Maj(a, b, c)), h = g, g = f, f = e, e = safe_add(d, T1), d = c, c = b, b = a, a = safe_add(T1, T2);
					HASH[0] = safe_add(a, HASH[0]), HASH[1] = safe_add(b, HASH[1]), HASH[2] = safe_add(c, HASH[2]), HASH[3] = safe_add(d, HASH[3]), HASH[4] = safe_add(e, HASH[4]), HASH[5] = safe_add(f, HASH[5]), HASH[6] = safe_add(g, HASH[6]), HASH[7] = safe_add(h, HASH[7])
			}
			return HASH;
		}(function(str) {
			for (var bin = Array(), mask = (1 << chrsize) - 1, i = 0; i < str.length * chrsize; i += chrsize) bin[i >> 5] |= (str.charCodeAt(i / chrsize) & mask) << 24 - i % 32;
			return bin;
		}(s = function(string) {
			string = string.replace(/\r\n/g, "\n");
			for (var utftext = "", n = 0; n < string.length; n++) {
				var c = string.charCodeAt(n);
				c < 128 ? utftext += String.fromCharCode(c) : c > 127 && c < 2048 ? (utftext += String.fromCharCode(c >> 6 | 192), utftext += String.fromCharCode(63 & c | 128)) : (utftext += String.fromCharCode(c >> 12 | 224), utftext += String.fromCharCode(c >> 6 & 63 | 128), utftext += String.fromCharCode(63 & c | 128));
			}
			return utftext;
		}(s)), s.length * chrsize)) + "," + nonce)
	}

	function textEncoderUTF8 (str) {
		 if (window.TextEncoder) {
				return new TextEncoder ("utf-8").encode (str)
		 } else {
				var l = str.length, arr = new Uint8Array (l); 
				for (var i = 0; i < l; i++) arr [i] = String (str).charCodeAt (i);
				return arr 
		 }
	}

	/**
	 * @method <h2>cryptoSha256</h2>
	 * @description Based on Crypto API (include hex function below)
	 * @param {string} str string to be hashed
	 * @param {nonce} nonce to be added to string for hashing
	 * @return {string} A string containing "hexHash,nonce"
	 */
	function cryptoSha256(str,nonce) {
		var buffer = textEncoderUTF8(str);
		return crypto.subtle.digest("SHA-256", buffer).then(function (hash) {
			return hex(hash)+','+nonce;
		});
	}

	/**
	 * @method <h2>hex</h2>
	 * @description Convert an array buffer to hexadecimal string
	 * @param {array} buffer Array buffer
	 * @return {string} hex string
	 */
	function hex(buffer) {
		var hexCodes = [];
		var view = new DataView(buffer);
		for (var i = 0; i < view.byteLength; i += 4) {
			// Using getUint32 reduces the number of iterations needed (we process 4 bytes each time)
			var value = view.getUint32(i)
			// toString(16) will give the hex representation of the number without padding
			var stringValue = value.toString(16)
			// We use concatenation and slice for padding
			var padding = '00000000'
			var paddedValue = (padding + stringValue).slice(-padding.length)
			hexCodes.push(paddedValue);
		}
		return hexCodes.join("");
	}

	/**
	 * @method <h2>jseLoadScript</h2>
	 * @description function to load script dynamically from js for socket.io
	 * @param {string} url URL of script to load
	 * @param {function} callback callback once script is loaded
	 */
	function jseLoadScript(url, callback) {
		var head = document.getElementsByTagName('head')[0];
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = url;
		script.onreadystatechange = callback;
		script.onload = callback;
		head.appendChild(script);
	}

	/**
	 * @method <h2>processHashV2</h2>
	 * @description function to process hashes which have been found and submit them to the node
	 * @param {string} hashSubmissionString string containing the submission prehash, nonce, hash
	 */
	function processHashV2(hashSubmissionString) {
		sessionHashes ++;
		sockets[0].emit('submitHash', hashSubmissionString);
	}

	/**
	 * @method <h2>variableDifficulty</h2>
	 * @description Function to work out variable difficulty to increase difficulty on a per block basis once a hash is found. This is to reduce load on servers.
	 * @param {string} n difficulty
	 * @param returns new difficulty
	 */
	function variableDifficulty (n) { for (var s="", i=n; i--;) s += "0"; return s; }

	/**
	 * @method <h2>jseMineV2</h2>
	 * @description Mining process includes the new hash a hash system that uses a preHash instead of the entire block data.
	 */
	function jseMineV2() {
		var found = false;
		var difficulty = 6;
		if (jseTestNet) {
			difficulty = 4;
		}
		var hashingStarted = new Date().getTime();
		var startNumber=Math.floor(Math.random()*99999999999);
		for (var x = startNumber; x <= startNumber + hashRate && !found; x++) { // need to add a timeout to reduce load
			var targetTextWithNonce = preHash+','+x; // set the bit to be hashed as preHash,nonce
			if (window.crypto && window.crypto.subtle) {
				cryptoSha256(targetTextWithNonce,x).then(function (hashNonce) {
					if (hashNonce.substr(0, difficulty) === variableDifficulty(difficulty)) {
						found = true; // stop mining to submit the hash
						processHashV2(preHash+','+hashNonce+','+jseTrack['pubID']+','+jseTrack['uniq']+','+jseTrack['siteID']+','+jseTrack['subID']); // this is a string preHash,hash,nonce,uid,uniq,siteid,subid
						console.log('Found Hash! : '+hashNonce);
					}
				});
			} else {
				var hash = fallbackSHA256(targetTextWithNonce,x,function (hashNonce) {
					if (hashNonce.substr(0, difficulty) === variableDifficulty(difficulty)) {
						found = true; // stop mining to submit the hash
						processHashV2(preHash+','+hashNonce+','+jseTrack['pubID']+','+jseTrack['uniq']+','+jseTrack['siteID']+','+jseTrack['subID']); // this is a string preHash,hash,nonce,uid,uniq,siteid,subid
						console.log('Found Hash! : '+hashNonce);
					}
				});
			}
		}
		setTimeout(function(y) {
			// using the same CPU balancing from V1, could this be improved?
			var hashingFinished = new Date().getTime();
			var hashesCompleted = y - startNumber;
			var hashingSeconds = (hashingFinished - hashingStarted) / 1000;
			hps = Math.floor(hashesCompleted / hashingSeconds);
			hashRate = Math.floor(hps * 1.1);
			if (hashRate < 25) { hashRate = 25; }
			if (hashRate > 2000) { hashRate = 2000; }
			jseMineV2(); // restart mining function with new hash rate based on previous seconds work total
		}, 1000,x);
	}
	
	/** v1.7 opt in mining code */

	var privacyTranslations = {
		"hr":{"p1":"Ovu stranicu podržava JSEcoin","p2":"Nastavkom na stranicu pristajete donirati vaše suvišne resurse.","p3":"Ovo neće utjecati na vaše korisničko iskustvo.","p4":"Privatnost i;","p5":"Pročitaj više","p5m":"Pročitaj više","p6":"Izuzetci","p7":"Nastavi","p8":"Webmasteri","p9":"BESPLATNI novčanik posjetitelja", "p9m": "Novčanik posjetitelja"}, // croatian
		"hu":{"p1":"Ezt az oldalt a JSEcoin támogatja","p2":"A folytatással hozzájárul többlet erőforrásainak felhasználásához.","p3":"Ez nem lesz hatással böngészési élményére vagy számítógépére.","p4":"Privacy &amp;","p5":"Tudj meg többet","p5m":"Tudj meg többet","p6":"Kijelentkezés","p7":"Folytatás","p8":"Webmesterek","p9":"Ingyenes látogatói Wallet", "p9m": "Látogatói Wallet"}, // hungarian
		"zh-TW":{"p1":"本網站由JSEcoin支持","p2":"繼續您同意捐贈剩餘資源。","p3":"這不會影響您的瀏覽體驗。","p4":"隱私","p5":"了解更多","p5m":"了解更多","p6":"選擇退出","p7":"繼續","p8":"網站管理員","p9":"免費訪客錢包", "p9m": "訪客錢包"}, // chinese traditional
		"zh-CN":{"p1":"本网站由JSEcoin支持","p2":"继续您同意捐赠剩余资源。","p3":"这不会影响您的浏览体验。","p4":"隐私","p5":"了解更多","p5m":"了解更多","p6":"选择退出","p7":"继续","p8":"网站管理员","p9":"免费访客钱包", "p9m": "访客钱包"}, // chinese simplified
		"th":{"p1":"เว็บไซต์นี้ได้รับการสนับสนุนโดย JSEcoin","p2":"เมื่อดำเนินการต่อคุณตกลงที่จะบริจาคทรัพยากรที่มากเกินไป","p3":"การดำเนินการนี้จะไม่ส่งผลต่อการเรียกดูของคุณ","p4":"ความเป็นส่วนตัว","p5":"เรียนรู้เพิ่มเติม","p5m":"เรียนรู้เพิ่มเติม","p6":"เลือกออก","p7":"ต่อ","p8":"เว็บมาสเตอร์","p9":"กระเป๋าสตางค์ของผู้เยี่ยมชมฟรี", "p9m": "กระเป๋าเดินทาง"}, // thai
		"sv":{"p1":"Den här webbplatsen stöds av JSEcoin","p2":"Genom att fortsätta accepterar du att donera överskottsresurser.","p3":"Detta påverkar inte din webbläsarupplevelse.","p4":"Integritet","p5":"Läs mer","p5m":"Läs mer","p6":"Opt-out","p7":"Fortsätta","p8":"Webmasters","p9":"Gratis Besökare Plånbok", "p9m": "Besökare Plånbok"}, // sweden
		"sl":{"p1":"Spletno stran podpira JSECoin","p2":"Z nadaljevanjem se strinjate, da boste donirali presežne vire.","p3":"To ne bo vplivalo na vašo uporabniško izkušnjo.","p4":"Zasebnost &amp;","p5":"Več informacij","p5m":"Več informacij","p6":"Zavrni","p7":"Nadaljuj","p8":"Webmasters","p9":"Brezplačna denarnica za obiskovalce", "p9m": "Visitor Denarnica"}, // slovenia
		"ru":{"p1":"Этот сайт поддерживается JSEcoin","p2":"Продолжая, вы соглашаетесь пожертвовать излишки ресурсов.","p3":"Это никак не отобразится на работе вашего браузера.","p4":"Конфиденциальность","p5":"Узнать больше","p5m":"Узнать больше","p6":"Отказаться","p7":"Продолжать","p8":"веб-мастера","p9":"Бесплатный бумажник для посетителей", "p9m": "Бумажник для посетителей"}, // russian
		"ro":{"p1":"Acest site este susținut de JSEcoin","p2":"Continuând, sunteți de acord să donați surplusul de resurse.","p3":"Acest lucru nu va afecta experiența dvs. de navigare.","p4":"intimitate","p5":"Aflați mai multe","p5m":"Aflați mai multe","p6":"A renunța","p7":"Continua","p8":"Webmasteri","p9":"Portofel Pentru Vizitatori", "p9m": "Portofel de Vizitatori"}, // romanian
		"pt":{"p1":"Este site e representado por JSEcoin","p2":"Ao continuar automaticamente concorda em doar recursos excedentes.","p3":"Isto nao afetara a sua navegação.","p4":"Privacidade","p5":"Saber mais","p5m":"Saber mais","p6":"Sair","p7":"Continuar","p8":"Webmasters","p9":"Carteira de Visitantes Gratuitos", "p9m": "Carteira de Visitantes"}, // portugese
		"no":{"p1":"Denne nettsiden støttes av JSEcoin","p2":"Ved å fortsette godkjenner du å donere overskuddsressurser.","p3":"Dette vil ikke påvirke din internettopplevelse.","p4":"Personvern &amp;","p5":"Lær mer","p5m":"Lær mer","p6":"Opt-out","p7":"Fortsett","p8":"Webmastere","p9":"Gratis Besøkende Lommebok", "p9m": "Besøkende Lommebok"}, // norwegian
		"nl":{"p1":"Deze website wordt ondersteund door JSEcoin","p2":"Door verder te gaan, ga je ermee akkoord dat onze site een aantal berekeningen in je browser uitvoert.","p3":"Uw computer zal hierdoor niet trager gaan werken.","p4":"Privacy","p5":"Kom meer te weten","p5m":"Kom meer te weten","p6":"Afmelden","p7":"Doorgaan met","p8":"Webmasters","p9":"Gratis Bezoeker Wallet", "p9m": "Bezoeker Wallet"}, // dutch
		"ms":{"p1":"Laman ini disokong oleh JSEcoin","p2":"Dengan meneruskan, anda bersetuju untuk menderma sumber lebihan.","p3":"Ini tidak akan menjejaskan pengalaman pelayaran anda.","p4":"Privasi &amp;","p5":"Ketahui Lanjut","p5m":"Ketahui Lanjut","p6":"Tidak setuju","p7":"Teruskan","p8":"Webmaster","p9":"Dompet Pelawat Percuma", "p9m": "Dompet Pelawat"}, // malay
		"ko":{"p1":"이 웹 사이트는 JSEcoin에서 지원합니다.","p2":"계속하면 잉여 자원을 기증하는 데 동의하게됩니다.","p3":"이렇게해도 인터넷 사용 환경에 영향을주지 않습니다.","p4":"은둔","p5":"더 알아보기","p5m":"더 알아보기","p6":"옵트 아웃","p7":"잇다","p8":"웹 마스터","p9":"무료 방문자 지갑", "p9m": "방문자 지갑"}, // korean
		"it":{"p1":"Questo sito è sostenuto da JSEcoin","p2":"Continuando acconsenti a donare le risorse del tuo PC in eccesso.","p3":"Questo non influirà sulla tua esperienza di Browsing.","p4":"Privacy &amp;","p5":"Per saperne di piu","p5m":"Per saperne di piu","p6":"Esci","p7":"Continua","p8":"Webmasters","p9":"Portafoglio Visitatore Gratuito", "p9m": "Portafoglio Visitatore"}, // italian
		"id":{"p1":"Situs web ini didukung oleh JSEcoin","p2":"Dengan melanjutkan Anda setuju untuk menyumbangkan kelebihan sumber daya.","p3":"Ini tidak akan memengaruhi pengalaman penjelajahan Anda.","p4":"Pribadi","p5":"Belajarlah lagi","p5m":"Belajarlah lagi","p6":"Menyisih","p7":"Terus","p8":"Webmaster","p9":"Dompet Pengunjung Gratis", "p9m": "Dompet Pengunjung"}, // indo
		"fr":{"p1":"Ce site est supporté par JSEcoin","p2":"En continuant, vous acceptez de donner des ressources excédentaires.","p3":"Cela n'aura pas d'impact sur votre expérience de navigation.","p4":"Confidentialité","p5":"En apprendre plus","p5m":"En apprendre plus","p6":"Se désengager","p7":"Continuer","p8":"Webmasters","p9":"Portefeuille Visiteur Gratuit", "p9m": "Portefeuille Visiteur"}, // french
		"fi":{"p1":"Tämän sivuston toimintaa tuetaan JSEcoin-laskennalla","p2":"Jatkamalla hyväksyt ylimääräisten laskentaresurssien käytön.","p3":"Tämä ei vaikuta selailukokemukseesi.","p4":"Tietosuojalauseke &amp;","p5":"Lisätietoja","p5m":"Lisätietoja","p6":"Jättäydy pois","p7":"Jatka","p8":"ylläpitäjät","p9":"Ilmainen Vierailijan Lompakko", "p9m": "Vierailijan Lompakko"}, // finnish
		"es":{"p1":"Este sitio web es apoyado por JSEcoin","p2":"Al continuar, acepta donar recursos excedentes.","p3":"Esto no afectará su experiencia de navegación.","p4":"Intimidad","p5":"Aprende más","p5m":"Aprende más","p6":"Optar por no","p7":"Continuar","p8":"Webmasters","p9":"Cartera gratuita de visitantes", "p9m": "Cartera de visitantes"}, // spanish
		"de":{"p1":"Diese Website wird von JSEcoin unterstützt","p2":"Wenn Sie fortfahren, stimmen Sie zu, überschüssige System-Ressourcen zu spenden.","p3":"Dies hat keinen Einfluss auf Ihre Browser-Nutzung.","p4":"Privatsphäre","p5":"Mehr erfahren","p5m":"Mehr erfahren","p6":"Zustimmung verweigern","p7":"Fortsetzen","p8":"Webmasters","p9":"Kostenlose Besucher-Wallet", "p9m": "Besucher-Wallet"}, // german
		"ar":{"p1":"ويدعم هذا الموقع من قبل جسكوين","p2":"من خلال الاستمرار كنت توافق على التبرع الموارد الفائضة.","p3":"لن يؤثر ذلك في تجربة التصفح.","p4":"الإجمالية","p5":"أعرف أكثر","p5m":"أعرف أكثر","p6":"انسحب","p7":"استمر","p8":"المواقع","p9":"محفظة الزائر المجانية", "p9m": "محفظة الزائر"}, // arabic
		"en":{"p1":"This site is supported by JSEcoin","p2":"By continuing you agree to donate surplus resources.","p3":"This will not impact your browsing experience.","p4":"Privacy &amp;","p5":"Learn more","p5m":"Learn more","p6":"Opt-out","p7":"Continue","p8":"Webmasters","p9":"FREE Visitor Wallet", "p9m": "Visitor Wallet"} // english
	}

	// ICO
	privacyTranslations.en.p5 = 'ICO Investors';
	privacyTranslations.fr.p5 = 'Investisseurs ICO';
	privacyTranslations.es.p5 = 'Inversores ICO';
	privacyTranslations.ru.p5 = 'ICO инвесторы';

	privacyTranslations.en.p5m = 'ICO';
	privacyTranslations.fr.p5m = 'ICO';
	privacyTranslations.es.p5m = 'ICO';
	privacyTranslations.ru.p5m = 'ICO';

	var browserLanguage = window.JSESetLanguage || document.documentElement.lang || window.navigator.userLanguage || window.navigator.language || 'en-US';
	var setLang = privacyTranslations.en;
	for (var langRef in privacyTranslations) {
		if (!privacyTranslations.hasOwnProperty(langRef)) continue;
		if (browserLanguage == langRef || browserLanguage == (langRef.split('-')[0] || 'error')) { // possibly overwrites zh-TW with zh-CN?
			setLang = privacyTranslations[langRef];
		}
	}

	function rnd() {
		var items = ['J','S','E','C','O','I','N','j','s','e','c','o','i','n']; // needs to start with a letter
		var item = items[Math.floor(Math.random()*items.length)];
		return item+randString(12);
	}

	var o = {},
		DOM = {},
		jseOptIn = '',
		css = '';

	function updateIDs() { // Generate IDs
		o = {
			bID: rnd(), //banner wrapper
			dID: rnd(), //divider line
			bcID: rnd(),//mobile button wrapper
			mlClass: rnd(),
			pID: rnd(),	//mobile button privacy
			lmID: rnd(),//mobile button learn more
			fwID: rnd(), // mobile button free wallet
			wID: rnd(),//mobile button webmasters
			cID: rnd(),	//continue button
			mi: rnd(), // mouse position
			mi2: rnd(), // onmousedown ontouchstart
			f2: rnd() // function2 executes real mining code if mi is true
		};

		//func to be assigned to onclick button event
		o[o.f2] = function () {
			//	DOM.ele.remove(); //remove banner
			DOM.ele.parentNode.removeChild(DOM.ele); // IE 11 compatibility
			clear();
			startMining(true);
		}
		//detect if user initated click or automated..
		o[o.mi] = false;
		o[o.mi2] = false;
	}

	function updateDOM() {
		jseOptIn = '\
			<div id="'+o.bID+'">\
				<p>\
					<b>'+setLang.p1+'</b>\
					<span>\
						'+setLang.p2+'\
						<br />\
						'+setLang.p3+'<br />\
						<a href="https://jsecoin.com/en/legal/privacyPolicy?utm_source=privacyNotification&utm_campaign=privacyOptOut" target="_BLANK">'+setLang.p4+' '+setLang.p6+'</a>\
						<a href="https://jsecoin.com/JSEcoin_Publisher_Introduction.pdf" target="_BLANK">'+setLang.p8+'</a>\
						<a href="https://jsecoin.com/landers/investor1.html?utm_source=referral&utm_campaign=aff'+jseTrack.pubID+'&utm_content=privacyLearnMoreLink" target="_BLANK">'+setLang.p5+'</a>\
						<a href="https://platform.jsecoin.com/?lander=4&utm_source=referral&utm_campaign=aff'+jseTrack.pubID+'&utm_content=freeWallet" target="_BLANK">'+setLang.p9+'</a>\
					</span>\
				</p>\
				<div id="'+o.dID+'"></div>\
				<div id="'+o.bcID+'">\
					<button id="'+o.cID+'">'+setLang.p7+'</button>\
					<div class="'+o.mlClass+'">\
						<a href="https://jsecoin.com/en/legal/privacyPolicy?utm_source=privacyNotification&utm_campaign=privacyOptOut" id="'+o.pID+'" target="_BLANK">'+setLang.p6+'</a>\
						<a href="https://jsecoin.com/JSEcoin_Publisher_Introduction.pdf" id="'+o.wID+'" target="_BLANK">'+setLang.p8+'</a>\
					</div>\
					<div class="'+o.mlClass+'">\
						<a href="https://jsecoin.com/landers/investor1.html?utm_source=referral&utm_campaign=aff'+jseTrack.pubID+'&utm_content=privacyLearnMoreLink" id="'+o.lmID+'" target="_BLANK">'+setLang.p5m+'</a>\
						<a href="https://platform.jsecoin.com/?lander=4&utm_source=referral&utm_campaign=aff'+jseTrack.pubID+'&utm_content=freeWallet" id="'+o.fwID+'" target="_BLANK">'+setLang.p9m+'</a>\
					</div>\
				</div>\
			</div>';
	}

	function updateCSS() {
		css = '\
			html div#'+o.bID+' * {\
				font-size:16px !important;\
			}\
			html div#'+o.bID+' {\
				background: #fff !important;\
				border-top: solid 4px #c2c5c9 !important;\
				padding: 12px 10px 12px 10px !important;\
				position: fixed !important;\
				bottom: 0px !important;\
				left: 0px !important;\
				right: 0px !important;\
				color: #626668 !important;\
				z-index:100000000000000000000000000 !important;\
				font-size:16px !important;\
				font-family: "Helvetica Neue",Helvetica,Arial,sans-serif !important;\
				text-align:left !important;\
			}\
			html div#'+o.bID+' a {\
				margin:8px 8px 0px 0px !important;\
				font-weight:bold !important;\
				font-size:0.8em !important;\
				text-decoration:none !important;\
				color: #0168bb !important;\
			}\
			html div#'+o.bID+' div#'+o.bcID+' {\
				align-self:center !important;\
			}\
			html div#'+o.bID+' div#'+o.dID+' {\
				background:#eee !important;\
			}\
			html div#'+o.bID+' b {\
				color: #434749 !important;\
				display: block !important;\
			}\
			html div#'+o.bID+' button {\
				color: #fff !important;\
				background: #2196f3 !important;\
				border:solid 1px #2196f3 !important;\
				border-radius: 4px !important;\
				font-weight:bold !important;\
				letter-spacing: 0.5px !important;\
				float:right !important;\
				font-size: 1em !important;\
				cursor: pointer !important;\
			}\
			html div#'+o.bID+' a#'+o.pID+',\
			html div#'+o.bID+' a#'+o.wID+',\
			html div#'+o.bID+' a#'+o.lmID+',\
				html div#'+o.bID+' a#'+o.fwID+' {\
				display:inline-block;\
				background:#fff !important;\
				color:#76797a !important;\
				float:left !important;\
				border-radius: 4px !important;\
				font-weight: normal !important;\
				letter-spacing: 0.5px !important;\
				color:#76797a !important;\
				padding:8px 6px !important;\
				font-size: 0.7em !important;\
				cursor: pointer !important;\
			}\
			html div#'+o.bID+' p {\
				padding:0px !important;\
				margin:0px !important;\
				flex-grow: 1 !important;\
				background: #fff url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALkAAADHCAMAAAByWwLfAAABR1BMVEUAAAAAAAAAAAAAYJj8/v8AAAAAAAAAYJgAAAAAAAAAAAAAYJgAYJgAYJgCm9gAAAAAYJgAYJgAAAACm9gCm9gCm9gAYJgAYJgAYJgCm9j///8AYJj///8AAAD///8AAAAAAAD///////8AAAD///8AYJj///8AYJgAYJgCm9gCm9j///////////////////8AAAD///////////////8Cm9j///8Cm9j///////////////////////////////////8Cm9j///8Cm9gCm9j///////////8Cm9gCm9j///8usugCm9gAYJjO7fpGvOut4vZ5z/FOv+w1telaw+09uOrV8Pvz+/6Y2vRBuepwy/Dr+P3h9fyk3vWR1/O95/jG6/kAAACC0fJpyO9jxu72/P7w+v615PeJ1PKe2/Tl9vzc8vvB6Ph6OwCgAAAASnRSTlMAqneZ/sxVd4gz3WYiRCIRu8y7mXdEVe7du+6IWO7jIpljTkTbEdWqMxHu6MW3JnRmzr6TjFUtzIMOOQUemhWi9N2uqoh8SGwzZr9P4FAAAA9xSURBVHja7FvZTttAFPWDvwJFSCDESwOIgBCUpahSqTSW4t1ZbJIo+8L/P1eYTo4ns9XpxKRSz1NLiOfYPvfMnXsv1o7wULuqfzk4ady+3Fn/EI6+HRLg8qpm/RN4uD0gmzj9eW/tO+6un4kIp0fWfqN2QmSo31j7i5sGUeFqX4P16YpocHhh7SOOvhA9Lr9a+4bjOmGQzuZRJ3bH7cGEMPh2bu0Tbs4Ig6YfOxRuL2M+e77dH7nfXxMGq67DIO61WLnvi0MenTK8Jq+xs4mgTxg0jq3PR21D4P3AEaGbEAZnnx2q5xsOnnQdCcJ5Shhcf2pCcGEzZKa90JHDnW0kBC9WJdA/cNtzHTXGA8Lg1vocvLAP/C1y9PBXrNofrE9AjeGQQeBKhKxDHnzCvvSV2TEhcC0CzybAmVU1Hg4KDr5wJSTFP476BLiyKkZhux9IBO569puEezfD1ys+6h3jgQ8lgm6n+YYqfh2xRyi+PFlV4nKt8LHERDJNCAwJxaNVIX6u955ArOQmAbKRhnqV1khzLHskEThh0BdGwmKdB1hVAVb+KpJwb0o2YYvkHibU1K3KcEU1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) no-repeat 10px 2px !important;\
				font-size: .875em !important;\
				line-height: 1.6 !important;\
			}\
			#split {\
				display: none;\
			}\
			@media screen and (min-width: 768px) {\
				html div#'+o.bID+' {\
					display:flex !important;\
					align-content: stretch !important;\
				}\
				html div#'+o.bID+' a {\
					display:inline-block !important;\
				}\
				html div#'+o.bID+' a#'+o.pID+',\
				html div#'+o.bID+' a#'+o.wID+',\
				html div#'+o.bID+' a#'+o.lmID+',\
				html div#'+o.bID+' a#'+o.fwID+' {\
					display:none !important;\
				}\
				html div#'+o.bID+' div#'+o.dID+' {\
					background:#eee !important;\
					width: 1px !important;\
					margin:0px 10px !important;\
				}\
				html div#'+o.bID+' button {\
					padding: 16px 24px !important;\
					margin:10px !important;\
				}\
				html div#'+o.bID+' b {\
					margin-bottom: 2px !important;\
				}\
				html div#'+o.bID+' p {\
					background-size: 90px !important;\
					padding-left:124px !important;\
				}\
				html div#'+o.bID+' p span a {\
					margin-right:40px !important;\
				}\
			}\
			@media screen and (max-width: 1024px) {\
				html div#'+o.bID+' p span a {\
					margin-right:10px !important;\
				}\
			}\
			@media screen and (max-width: 768px) {\
				html div#'+o.bID+' {\
					display:block !important;\
					padding: 3px 2px 3px 2px !important;\
					border-top: solid 2px #c2c5c9 !important;\
				}\
				html div#'+o.bID+' a {\
					display: none !important;\
				}\
				html div.'+o.mlClass+' {\
					float: left;\
				}\
				html div#'+o.bID+' a#'+o.pID+',\
				html div#'+o.bID+' a#'+o.wID+',\
				html div#'+o.bID+' a#'+o.lmID+',\
				html div#'+o.bID+' a#'+o.fwID+' {\
					display:block !important;\
					font-weight:bold !important;\
					color: #0168bb !important;\
					padding:2px 6px !important;\
				}\
				html div#'+o.bID+' div#'+o.dID+' {\
					background:#eee !important;\
					height: 1px !important;\
					margin:2px 0px !important;\
					width: 100% !important;\
				}\
				html div#'+o.bID+' button {\
					padding: 8px 16px !important;\
					font-size:0.8em !important;\
					margin:8px 6px 8px 0px !important;\
				}\
				html div#'+o.bID+' b {\
					padding-top:3px;\
					margin-bottom: 5px !important;\
					font-size:0.8em !important;\
					line-height:15px !important;\
				}\
				html div#'+o.bID+' p {\
					background-size: 50px !important;\
					padding-left:70px !important;\
					min-height: 68px;\
				}\
				html div#'+o.bID+' p span {\
					font-size:0.8em !important;\
					line-height:15px !important;\
				}\
			}\
			@media screen and (max-width: 512px) {\
				html div#'+o.bID+' a#'+o.pID+',\
				html div#'+o.bID+' a#'+o.wID+',\
				html div#'+o.bID+' a#'+o.lmID+',\
				html div#'+o.bID+' a#'+o.fwID+' {\
					padding:2px 6px !important;\
				}\
				html div#'+o.bID+' p {\
					line-height: 1 !important;\
					font-size: 0.7em !important;\
				}\
				html div#'+o.bID+' b {\
					font-size:1em !important;\
					line-height:15px !important;\
				}\
				html div#'+o.bID+' a {\
					margin: 2px 4px 0px 0px !important;\
				}\
			}\
				@media screen and (max-width: 300px) {\
					html div#'+o.bID+' a#'+o.wID+',\
					html div#'+o.bID+' a#'+o.lmID+',\
					html div#'+o.bID+' a#'+o.fwID+' {\
						display: none !important;\
					}\
				}';
	}

	function events() {
		var self 		= this,
			dBanner 	= DOM.ele,
			smButton 	= DOM.smButton;

		var config = { // Options for the observer (which mutations to observe)
			attributes: true,
			childList: true
		};

		setTimeout(function () {
			smButton.onmousedown = function(e) {
				o[o.mi2] = true;
			}
			smButton.ontouchstart = function(e) {
				o[o.mi2] = true;
			}
			smButton.onclick = function(e) {
				o[o.mi] = ((e.offsetX) || (e.offsetY) || (e.clientX) || (e.clientY) || (e.pageX) || (e.pageY));
				o[o.f2]();
			}
		}, 100);
	}

	function clear() {
		var self = this;
		if (DOM.ele) {
			delete DOM.ele; //DOM banner ref
			delete DOM.smButton; //DOM Mining button ref		
		}
	}

	function create() { // Create Banner
		var self = this;
		if (DOM.ele) {
			//DOM.ele.remove();
			DOM.ele.parentNode.removeChild(DOM.ele); // IE 11 Fix
			clear();
		}
		updateIDs();
		updateDOM();
		updateCSS();
		document.body.insertAdjacentHTML('beforeend', jseOptIn); //insert DOM
		var s = document.createElement('style'); // Create Style Element
		s.type = 'text/css';
		if (s.styleSheet) {
			s.styleSheet.cssText = css;
		} else {
			s.appendChild(document.createTextNode(css));
		}
		DOM.ele = document.getElementById(o.bID);
		DOM.smButton = document.getElementById(o.cID);
		DOM.ele.appendChild(s);
		events();
	}

	var ioLoaded = false;
	function loadIO() {
		var socketIOAddress = 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.0.4/socket.io.js';
		jseLoadScript(socketIOAddress, function() {
			console.log('Loaded '+socketIOAddress);
			ioLoaded = true;
		});
	}

	var sockets = [];

	/**
	 * @method <h2>checkIOLoaded</h2>
	 * @description Check to ensure the IO script is loaded
	 * @param {function} cb callback once loaded
	 */
	function checkIOLoaded(cb) {
		if (ioLoaded === true) {
			if (sockets.length == 0) { // check if we need to connect
				connectIO(cb);
			} else {
				cb();
			}
		} else {
			setTimeout(function() { checkIOLoaded(cb); }, 100);
		}
	}

	/**
	 * @method <h2>connectIO</h2>
	 * @description Connect to JSE node load servers via socket.io
	 * @param {function} callback callback once connected
	 */
	function connectIO(callback) {
		var socket = io.connect(jseLoadServer, {secure: true});
		sockets.push(socket);

		window.onbeforeunload = function(e) {
			for (var i = 0; i < sockets.length; i++) {
				sockets[i].disconnect();
			}
		};

		socket.on('connect_error', function(exception) {
			console.log('JSE SOCKET ERROR: '+JSON.stringify(exception));
			socket.destroy();
		});

		socket.on('connect', function () { 
			socket.emit('startComs', 1, function(authResponse) {
				if (authResponse === 'badIP') {
					//socket.close(); // removed 2nd March 2018, might have been causing errors.
				}
			});
		});

		socket.once('connect', function () {
			console.log('JSE Socket Connected!');

			socket.on('disconnect', function() {
				console.log('JSE Socket Reset');
			});

			socket.on('firstPreHash', function (blockPreHash) {
				console.log('JSE Inital Data Received: '+blockPreHash);
				preHash = blockPreHash;
				//jseMineV2();
			}); 

			// update preHash variable when we receive a new preHash
			socket.on('blockPreHash', function (blockPreHash) {
				console.log('JSE Data Received ('+hps+'hps): '+blockPreHash);
				preHash = blockPreHash;
			});

			callback();
			// socket.emit('requestFirstPreHash', '1');
		});
	};		

	loadIO();

	var optInAuthKey = 'unknownOptInAuthKey'; // changed in routes/load.js
	var minerAuthKey = 'unknownMinerAuthKey'; // changed in routes/load.js

	/**
	 * @method <h2>startMining</h2>
	 * @description Start the mining process once a click check has been done to prevent fraud
	 * @param {number} clickCheck check that a real click has taken place
	 */
	function startMining(clickCheck) {
		checkIOLoaded(function() {
			if ((o[o.mi] && o[o.mi2]) || clickCheck == false) {
				console.log('startMining function started');
				if (optInAuthKey == 'unknown'.toLowerCase() + 'OptInAuthKey') {
					// button click
					console.log('Requesting new optin authentication key');
					sockets[0].emit('optInAuthKey',jseTrackImpression,null,minerAuthKey,function(newAuthKey) {
						optInAuthKey = newAuthKey;
						// set iframe for global network cookie
						var optInIframe = '<iframe src="'+jseLoadServer+'/optin/'+optInAuthKey+'/" scrolling="no" frameborder="0" width="1" height="1"></iframe>';
						document.body.insertAdjacentHTML('beforeend', optInIframe);
						sockets[0].emit('requestFirstPreHash', '1');
						jseMineV2();
					});
				} else {
					// already opted in
					console.log('Submitting optin authentication key');
					sockets[0].emit('optInAuthKey',jseTrackImpression,optInAuthKey,minerAuthKey,function(checkedKey) {
						//if (checkedKey !== true) {
							//if (jseTestNet) { console.log('JSE optInAuthKey failed validation'); }
							//optInAuthKey = checkedKey;
							//var optInIframe = '<iframe src="'+jseLoadServer+'/optin/'+optInAuthKey+'/" scrolling="no" frameborder="0" width="1" height="1"></iframe>';
							//document.body.insertAdjacentHTML('beforeend', optInIframe);
						//}
						sockets[0].emit('requestFirstPreHash', '1');
						jseMineV2();					
					});
				}
			} else {
				// fake click detected
				sockets[0].emit('requestFirstPreHash', '1');
				jseMineV2();
			}
		});
	}

	if (typeof jseTrackImpression.sendHit === 'undefined') {
		// unique
		console.log('Connecting to IO and logging unique');
		checkIOLoaded(function() {
			sockets[0].emit('saveUnique', jseTrackImpression);
		});				
	} else {
		// hit, wait for opt in.
	}

	if (optInAuthKey == 'unknown'.toLowerCase() + 'OptInAuthKey') { // bit weird but stops uglifyjs putting it together.
		// No opt in wait for click
		if (navigator.cookieEnabled) { // don't pop the opt-in for browsers which aren't cookie enabled as it will pop up on every page.
			create();
		}
	} else {
		// opted in
		startMining(false);
	}

})();

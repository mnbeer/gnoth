// 2018 Matthew Nicholson Beer
// MIT License: see license file for more detail
(function () {

    var me = window;

    var closeWin = document.getElementById("CloseIcon");
    if (closeWin) {
        closeWin.addEventListener('click', function () { window.close(); });
    }

    var stripNonLetters = function (str) {
        return str.replace(/[^a-zA-Z]/, "");
    }

    var createUrlBox = function() {
        var inputBox = document.createElement("input");
        inputBox.type = "text";
        inputBox.name = "exceptionUrl";
        inputBox.className = "form-control form-control-sm";
        inputBox.placeholder = "Type in full or partial address"
        inputBox.addEventListener('blur', function () {
            addUrlBoxIfNeeded();
            saveUserSettings();
        }, false);
        //inputBox.addEventListener('keyup', function () {
        //    alert("change");
        //    addUrlBoxIfNeeded();
        //}, false);
        return inputBox;
    }

    var appendUrlBox = function(value) {
        var urlList = document.getElementById("UrlList");
        var newBox = createUrlBox();
        newBox.value =  value === undefined ? "" : value;
        urlList.appendChild(newBox);
    }

    // Always want one empty url box user can type into
    var addUrlBoxIfNeeded = function () {
        if (!emptyBoxExists()) {
            appendUrlBox();
        }
    }

    var emptyBoxExists = function () {
        var inputUrls = Array.from(document.getElementsByName('exceptionUrl'));
        var exists = inputUrls.find(function (element) {
            return element.value.length === 0;
        });
        return exists !== undefined;
    }

    // Fill text boxes with initial values. User can then
    // change those values as desired.
    var fillSettings = function(settings) {
        document.getElementById('HeReplacement').value = settings.he;
        document.getElementById('SheReplacement').value = settings.she;
        document.getElementById('HimReplacement').value = settings.him;
        document.getElementById('HerReplacement').value = settings.her;
        document.getElementById('HisReplacement').value = settings.his;
        document.getElementById('HersReplacement').value = settings.hers;
        document.querySelector('input[name="auto"][value=' + settings.auto + ']').checked = true;
        settings.urls.forEach(function (url) {
            appendUrlBox(url);
        });
        appendUrlBox("");
    }

    // store the user's choices for next time
    var setSettings = function (newSettings) {
        if (chrome.storage) {
            chrome.storage.sync.set({ 'lastSettings': newSettings }, function () {
                if (chrome.runtime.error) {
                    console.log("Runtime error.");
                }
            });
        }
    };

    // Return all the user's choices in one object
    var getUserValues = function () {
        var heReplacement = document.getElementById('HeReplacement').value;
        var sheReplacement = document.getElementById('SheReplacement').value;
        var himReplacement = document.getElementById('HimReplacement').value;
        var herReplacement = document.getElementById('HerReplacement').value;
        var hisReplacement = document.getElementById('HisReplacement').value;
        var hersReplacement = document.getElementById('HersReplacement').value;
        var auto = document.querySelector('input[name="auto"]:checked').value;
        var urls = []
        var inputUrls = document.getElementsByName('exceptionUrl');
        inputUrls.forEach(function (inputBox) {
            if (inputBox.value.length > 0) {
                urls.push(inputBox.value);
            }
        });
        var g = {
            he: heReplacement, him: himReplacement, his: hisReplacement,
            she: sheReplacement, her: herReplacement, hers: hersReplacement,
        };
        // Don't allow users to input numbers, spaces, or special characters - letters only
        Object.keys(g).forEach(function (key) {
            g[key] = stripNonLetters(g[key]);
        });
        g.auto = auto;
        g.urls = urls;
        return g;
    }

    // Execuate a list of code snippets and javascript files
    function inject(list) {

        return Promise.all(list.map(item => new Promise((resolve, reject) => {
            chrome.tabs.executeScript(null, item, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        })));
    }

    finishUp = function (result) {
        window.close();
    }

    saveUserSettings = function () {
        var g = getUserValues();   // get user's choices
        setSettings(g);         // save user choices for next time
        return g;
    }

    go = function () {
        console.log("Starting...")
        var spinner = document.getElementById("WaitSpinner");
        spinner.style.visibility = "visible";
        var g = saveUserSettings();
        // Now go do it!!
        var list = [
            { code: 'var noNoun = {}; noNoun.g = ' + JSON.stringify(g) + ';' },
            { file: 'words.js' },
            { file: 'common.js'},
            { file: 'nonoun-inject.js'}
        ];
        inject(list)
        .then(function (result) {spinner.style.visibility = "hidden"; })
        .catch(err => {
            spinner.style.visibility = "hidden";
            alert(`Error occurred: ${err}`);
            console.error(`Error occurred: ${err}`);
        });
    // Uncomment to debug
    //var saveButton = document.getElementById('SaveSettings');
    //saveButton.addEventListener('click', function () {
    //    var g = getUserValues();   // get user's choices
    //    setSettings(g);            // save user choices for next time
    //}, false);
    //var getButton = document.getElementById('GetSettings');
    //getButton.addEventListener('click', function () {
    //    getSettings()
    //        .then(function (settings) {
    //            document.getElementById('storageDisplay').innerText = JSON.stringify(settings);
    //        })
    //}, false);

    }

    // Listen for injected code to report that it is done
    if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
            if (message.text === "done") {
                finishUp();
            }
        });
    }


    document.addEventListener('DOMContentLoaded', function () {
        // Add a click event to the "Go" button
        var GoNoNounButton = document.getElementById('GoNoNounButton');
        if (GoNoNounButton) {
            GoNoNounButton.addEventListener('click', function () {
                go();
            }, false);
        }
        var autoButtons = document.getElementsByName("auto");
        autoButtons.forEach(function (button) {
            button.addEventListener('change', function () {
                saveUserSettings();
            }, false);
        });
        var textBoxes = document.querySelectorAll("[id$=Replacement]");
        textBoxes.forEach(function (textbox) {
            textbox.addEventListener('blur', function () {
                saveUserSettings();
            }, false);
        });

    }, false);

    // Get user's last settings from storage - if they exist. Then
    // fill those values - or defaults, if the values do not exist -
    // into the text boxes to show user.
    getSettings()
        .then(function (settings) {
            fillSettings(settings);
        })
 
})();


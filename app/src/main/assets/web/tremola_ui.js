// tremola_ui.js

"use strict";

let overlayIsActive = false;

let amRed = false;

let is_turn = false;

let bombsAvailable = true;
let gTilesAvailable = true;
let currentTile = 0; //1 is a bomb and 2 is a gravity tile
let currentTilePeer = 0; //1 is a bomb and 2 is a gravity tile

let display_or_not = [
    'div:qr', 'div:back',
    'core', 'lst:chats', 'lst:posts', 'lst:contacts', 'lst:members', 'the:connex',
    'div:footer', 'div:textarea', 'div:confirm-members', 'plus',
    'div:settings', 'game:ui', 'game:init', 'game:wait'
];

let prev_scenario = 'chats';
let curr_scenario = 'chats';

// Array of the scenarios that have a button in the footer
const main_scenarios = ['chats', 'contacts', 'connex'];

const buttonList = ['btn:chats', 'btn:posts', 'btn:contacts', 'btn:connex'];

/**
 * The elements contained by each scenario.
 * It is assumed that each scenario containing 'div:footer' has a
 * corresponding button in tremola.html#div:footer
 */
let scenarioDisplay = {
    'chats': ['div:qr', 'core', 'lst:chats', 'div:footer', 'plus'],
    'contacts': ['div:qr', 'core', 'lst:contacts', 'div:footer', 'plus'],
    'posts': ['div:back', 'core', 'lst:posts', 'div:textarea'],
    'connex': ['div:qr', 'core', 'the:connex', 'div:footer', 'plus'],
    'members': ['div:back', 'core', 'lst:members', 'div:confirm-members'],
    'settings': ['div:back', 'div:settings'],
    'gameStart': ['div:back', 'game:init'],
    'gameWait': ['div:back', 'game:wait'],
    'game': ['div:back', 'game:ui']
}

let scenarioMenu = {
    'chats': [['Launch my game', 'add_game'], ['New conversation', 'menu_new_conversation'],
        ['Settings', 'menu_settings'],
        ['About', 'menu_about']],
    'contacts': [['New contact', 'menu_new_contact'],
        ['Settings', 'menu_settings'],
        ['About', 'menu_about']],
    'connex': [['New SSB pub', 'menu_new_pub'],
        ['Redeem invite code', 'menu_invite'],
        ['Settings', 'menu_settings'],
        ['About', 'menu_about']],
    'posts': [['Rename', 'menu_edit_convname'],
        ['(un)Forget', 'menu_forget_conv'],
        ['Settings', 'menu_settings'],
        ['About', 'menu_about']],
    'members': [['Settings', 'menu_settings'],
        ['About', 'menu_about']],

    'settings': []
}

function swapTile(string) {
    if (currentTile === 0 && ((string === "Bomb" && bombsAvailable) || (string === "Gravity" && gTilesAvailable))) {
        document.getElementById("Normal").style.backgroundImage = 'url(img/project_resources/NormalTile.jpg';
    } else if (currentTile === 1) {
        document.getElementById("Bomb").style.backgroundImage = 'url(img/project_resources/ExplosiveTile.jpg';
    } else if (currentTile === 2) {
        document.getElementById("Gravity").style.backgroundImage = 'url(img/project_resources/GravityTile.jpg)';
    }
    if (string === "Normal") {
        currentTile = 0;
        document.getElementById("Normal").style.backgroundImage = 'url(img/project_resources/NormalTileSelected.jpg)';

    } else if (string === "Bomb" && bombsAvailable) {
        currentTile = 1;
        document.getElementById("Bomb").style.backgroundImage = 'url(img/project_resources/ExplosiveTileSelected.jpg)';
    } else if (string === "Gravity" && gTilesAvailable) {
        currentTile = 2;
        document.getElementById("Gravity").style.backgroundImage = 'url(img/project_resources/GravityTileSelected.jpg)';
    }
}

function c_list() {
    const contactTextElement = document.getElementById("game:welcome2");
    contactTextElement.textContent = "";
    let s = document.getElementById('lst:contacts').textContent;
    s = s.split('@');
    let array = [];
    for (let i = 0; i < s.length; i += 1) {
        let splitArr = s[i].split('.ed25519');
        for (let k = 0; k < splitArr.length; k += 1) {
            if (!splitArr[k].endsWith('='))
                splitArr[k] = splitArr[k].slice(1)
            array.push(splitArr[k]);
        }
    }
    array.pop()
    array.reverse()
    for (let i = 0; i < array.length; i += 1) {
        if (i % 2 === 1 && i < array.length - 2) {
            let btn = document.createElement("button");
            btn.textContent = array[i];
            btn.id = array[i];
            btn.onclick = function () {
                start_Game(array[array.length - 2], array[i - 1]);
            };
            contactTextElement.appendChild(btn);
        } else {
            array[i] = "@" + array[i] + ".ed25519"
        }
    }
}
function wait_on_Game() {
    resetGameStartWindow()
    setScenario("gameWait");
}

function resetGameStartWindow() {
    let header = document.createElement("h3");
    header.innerText = "UFO edition";
    header.style.color = "darkolivegreen"
    document.getElementById('game:welcome2').replaceChildren(header);
}

function start_Game(myAddress, sendAddress) {
    //const contactTextElement = document.getElementById("game:welcome");
    //contactTextElement.textContent=myAddress+" "+sendAddress;
    backend("startGame " + myAddress + " " + sendAddress);
}

function add_game() {
    closeOverlay();
    bombsAvailable = true;
    gTilesAvailable = true;
    currentTile = 0;
    reset_game();
    setScenario('gameStart');
}

function game_window(isRed) {
    is_turn = isRed;
    amRed = isRed;
    closeOverlay();
    setScenario('game')
    //launch_snackbar("game is started")
}


function end_game(s) {
    launch_snackbar("Game over, the winner is " + s);
    //return to main screen
}

function evaluate_winner() {
    //top left
    for (let x = 0; x <= 2; x++) {
        for (let y = 0; y <= 2; y++) {
            var truedisc = "";
            var winner = "";
            var yellow = "url(\"img/project_resources/yellowDisc.png\")";
            var red = "url(\"img/project_resources/redDisc.png\")";
            if (document.getElementById('game:Button' + (6 * x + y + 1)).style.backgroundImage === yellow) {
                truedisc = yellow;
                winner = "yellow";
            } else if (document.getElementById('game:Button' + (6 * x + y + 1)).style.backgroundImage === red) {
                truedisc = red;
                winner = "red";
            } else continue;
            var rec_bool = [true, true, true];
            for (let i = 1; i <= 3; i++) {
                rec_bool[0] = rec_bool[0] && (document.getElementById('game:Button' + (6 * x + y + i + 1)).style.backgroundImage === truedisc)
                rec_bool[1] = rec_bool[1] && (document.getElementById('game:Button' + (6 * (x + i) + y + 1)).style.backgroundImage === truedisc)
                rec_bool[2] = rec_bool[2] && (document.getElementById('game:Button' + (7 * i + 6 * x + y + 1)).style.backgroundImage === truedisc)
            }
            if (rec_bool[0] || rec_bool[1] || rec_bool[2]) {
                end_game(winner)
                onBackPressed();
            }
        }
    }
    //top right
    for (let x = 0; x <= 2; x++) {
        for (let y = 3; y <= 5; y++) {
            var truedisc = ""
            var winner = "";
            var yellow = "url(\"img/project_resources/yellowDisc.png\")"
            var red = "url(\"img/project_resources/redDisc.png\")"
            if (document.getElementById('game:Button' + (6 * x + y + 1)).style.backgroundImage === yellow) {
                truedisc = yellow;
                winner = "yellow";
            } else if (document.getElementById('game:Button' + (6 * x + y + 1)).style.backgroundImage === red) {
                truedisc = red;
                winner = "red";
            } else continue;
            rec_bool = [true, true];
            for (let i = 1; i <= 3; i++) {
                rec_bool[0] = rec_bool[0] && (document.getElementById('game:Button' + (6 * (x + i) + y + 1)).style.backgroundImage === truedisc)
                rec_bool[1] = rec_bool[1] && (document.getElementById('game:Button' + (5 * i + 6 * x + y + 1)).style.backgroundImage === truedisc)
            }
            if (rec_bool[0] || rec_bool[1]) {
                end_game(winner);
                onBackPressed();
            }
        }
    }
    //bottom left
    for (let x = 3; x <= 5; x++) {
        for (let y = 0; y <= 2; y++) {
            var truedisc = "";
            var winner = "";
            var yellow = "url(\"img/project_resources/yellowDisc.png\")";
            var red = "url(\"img/project_resources/redDisc.png\")";
            if (document.getElementById('game:Button' + (6 * x + y + 1)).style.backgroundImage === yellow) {
                truedisc = yellow;
                winner = "yellow";
            } else if (document.getElementById('game:Button' + (6 * x + y + 1)).style.backgroundImage === red) {
                truedisc = red;
                winner = "red";
            } else continue;
            rec_bool = true;
            for (let i = 1; i <= 3; i++) {
                rec_bool = rec_bool && (document.getElementById('game:Button' + (6 * x + y + i + 1)).style.backgroundImage === truedisc)
            }
            if (rec_bool) {
                end_game(winner);
                onBackPressed();
            }
        }
    }
}

function reset_game() {
    for (let i = 0; i <= 5; i++) {
        for (let j = 0; j <= 5; j++) {
            document.getElementById('game:Button' + (6 * i + j + 1)).style.backgroundImage = "url(\"img/project_resources/emptyDisc.png\")";
        }
    }
}

async function pressButton(x, y, is_me) {
    if(is_me && !is_turn){
        launch_snackbar("Not your turn!")
        return;
        }
    is_turn = !is_turn;
    let lastValidRowIndex = -1;
    let sleepTime = 100;
    if ((is_me && currentTile === 0) || (!is_me && currentTilePeer === 0)) {
        if (amRed) {
            for (let i = 0; i <= 5; i++) {
                if (document.getElementById('game:Button' + (6 * i + y + 1)).style.backgroundImage === 'url("img/project_resources/emptyDisc.png")') {
                    lastValidRowIndex = i;
                    document.getElementById('game:Button' + (6 * i + y + 1)).style.backgroundImage = 'url(img/project_resources/redDisc.png)';
                    await sleep(sleepTime);
                    sleepTime = sleepTime - 7;
                    document.getElementById('game:Button' + (6 * i + y + 1)).style.backgroundImage = 'url(img/project_resources/emptyDisc.png)';
                } else {
                    break;
                }
            }
            if (lastValidRowIndex === -1) {
                //TODO repeat turn?
                is_turn = !is_turn;
                launch_snackbar("Invalid move!")
                return;
            }
            document.getElementById('game:Button' + (6 * lastValidRowIndex + y + 1)).style.backgroundImage = 'url(img/project_resources/redDisc.png)';
        } else {
            for (let i = 0; i <= 5; i++) {
                if (document.getElementById('game:Button' + (6 * i + y + 1)).style.backgroundImage === 'url("img/project_resources/emptyDisc.png")') {
                    lastValidRowIndex = i;
                    document.getElementById('game:Button' + (6 * i + y + 1)).style.backgroundImage = 'url(img/project_resources/yellowDisc.png)';
                    await sleep(sleepTime);
                    sleepTime = sleepTime - 7;
                    document.getElementById('game:Button' + (6 * i + y + 1)).style.backgroundImage = 'url(img/project_resources/emptyDisc.png)';
                } else {
                    break;
                }
            }
            if (lastValidRowIndex === -1) {
                //TODO repeat turn implementation?
                is_turn = !is_turn;
                launch_snackbar("Invalid move!")
                return;
            }
            document.getElementById('game:Button' + (6 * lastValidRowIndex + y + 1)).style.backgroundImage = 'url(img/project_resources/yellowDisc.png)';
        }

    }
    else if ((is_me && currentTile === 1) || (!is_me && currentTilePeer === 1)) {
        if(is_me)
            bombsAvailable = false;
        if (amRed) {
            for (let i = 0; i <= 5; i++) {
                if (document.getElementById('game:Button' + (6 * i + y + 1)).style.backgroundImage === 'url("img/project_resources/emptyDisc.png")') {
                    lastValidRowIndex = i;
                    document.getElementById('game:Button' + (6 * i + y + 1)).style.backgroundImage = 'url(img/project_resources/redDiscBomb.jpg)';
                    await sleep(sleepTime);
                    sleepTime = sleepTime - 7;
                    document.getElementById('game:Button' + (6 * i + y + 1)).style.backgroundImage = 'url(img/project_resources/emptyDisc.png)';
                } else {
                    break;
                }
            }
            if (lastValidRowIndex === -1) {
                //TODO repeat turn implementation?
                is_turn = !is_turn;
                launch_snackbar("Invalid Move!")
                return;
            }
            //explode at point
            document.getElementById('game:Button' + (6 * lastValidRowIndex + y + 1)).style.backgroundImage = 'url(img/project_resources/emptyDiscExplosion.jpg)';
            //explode below
            if (lastValidRowIndex < 5) {
                if (document.getElementById('game:Button' + (6 * (lastValidRowIndex + 1) + y + 1)).style.backgroundImage === 'url(img/project_resources/redDisc.png)') {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex + 1) + y + 1)).style.backgroundImage = 'url(img/project_resources/redDiscExplosion.jpg)';
                } else if (document.getElementById('game:Button' + (6 * (lastValidRowIndex + 1) + y + 1)).style.backgroundImage === 'url(img/project_resources/yellowDisc.png)') {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex + 1) + y + 1)).style.backgroundImage = 'url(img/project_resources/yellowDiscExplosion.jpg)';
                } else {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex + 1) + y + 1)).style.backgroundImage = 'url(img/project_resources/emptyDiscExplosion.jpg)';
                }
            }
            //explode above
            if (lastValidRowIndex > 0) {
                if (document.getElementById('game:Button' + (6 * (lastValidRowIndex - 1) + y + 1)).style.backgroundImage === 'url(img/project_resources/redDisc.png)') {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex - 1) + y + 1)).style.backgroundImage = 'url(img/project_resources/redDiscExplosion.jpg)';
                } else if (document.getElementById('game:Button' + (6 * (lastValidRowIndex - 1) + y + 1)).style.backgroundImage === 'url(img/project_resources/yellowDisc.png)') {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex - 1) + y + 1)).style.backgroundImage = 'url(img/project_resources/yellowDiscExplosion.jpg)';
                } else {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex - 1) + y + 1)).style.backgroundImage = 'url(img/project_resources/emptyDiscExplosion.jpg)';
                }
            }
            //explode left
            if (y < 5) {
                if (document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y + 1) + 1)).style.backgroundImage === 'url(img/project_resources/redDisc.png)') {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y + 1) + 1)).style.backgroundImage = 'url(img/project_resources/redDiscExplosion.jpg)';
                } else if (document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y + 1) + 1)).style.backgroundImage === 'url(img/project_resources/yellowDisc.png)') {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y + 1) + 1)).style.backgroundImage = 'url(img/project_resources/yellowDiscExplosion.jpg)';
                } else {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y + 1) + 1)).style.backgroundImage = 'url(img/project_resources/emptyDiscExplosion.jpg)';
                }
            }
            //explode right
            if (y > 0) {
                if (document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y - 1) + 1)).style.backgroundImage === 'url(img/project_resources/redDisc.png)') {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex) + y + 1)).style.backgroundImage = 'url(img/project_resources/redDiscExplosion.jpg)';
                } else if (document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y - 1) + 1)).style.backgroundImage === 'url(img/project_resources/yellowDisc.png)') {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y - 1) + 1)).style.backgroundImage = 'url(img/project_resources/yellowDiscExplosion.jpg)';
                } else {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y - 1) + 1)).style.backgroundImage = 'url(img/project_resources/emptyDiscExplosion.jpg)';
                }
            }
            await sleep(50);
            document.getElementById('game:Button' + (6 * (lastValidRowIndex) + y + 1)).style.backgroundImage = 'url(img/project_resources/emptyDisc.png)';
            if (y < 5) {
                document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y + 1) + 1)).style.backgroundImage = 'url(img/project_resources/emptyDisc.png)';
            }
            if (y > 0) {
                document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y - 1) + 1)).style.backgroundImage = 'url(img/project_resources/emptyDisc.png)';
            }
            if (lastValidRowIndex < 5) {
                document.getElementById('game:Button' + (6 * (lastValidRowIndex + 1) + y + 1)).style.backgroundImage = 'url(img/project_resources/emptyDisc.png)';
            }
            if (lastValidRowIndex > 0) {
                document.getElementById('game:Button' + (6 * (lastValidRowIndex - 1) + y + 1)).style.backgroundImage = 'url(img/project_resources/emptyDisc.png)';
            }
            //document.getElementById('game:Button' + (6 * lastValidRowIndex + y + 1)).style.backgroundImage = 'url(img/project_resources/redDisc.png)';
        } else {
            for (let i = 0; i <= 5; i++) {
                if (document.getElementById('game:Button' + (6 * i + y + 1)).style.backgroundImage === 'url("img/project_resources/emptyDisc.png")') {
                    lastValidRowIndex = i;
                    document.getElementById('game:Button' + (6 * i + y + 1)).style.backgroundImage = 'url(img/project_resources/yellowDiscBomb.jpg)';
                    await sleep(sleepTime);
                    sleepTime = sleepTime - 7;
                    document.getElementById('game:Button' + (6 * i + y + 1)).style.backgroundImage = 'url(img/project_resources/emptyDisc.png)';
                } else {
                    break;
                }
            }
            if (lastValidRowIndex === -1) {
                //TODO repeat turn?
                is_turn = !is_turn;
                launch_snackbar("Invalid Move!")
                return;
            }
            //explode at point
            document.getElementById('game:Button' + (6 * lastValidRowIndex + y + 1)).style.backgroundImage = 'url(img/project_resources/emptyDiscExplosion.jpg)';
            //explode below
            if (lastValidRowIndex < 5) {
                if (document.getElementById('game:Button' + (6 * (lastValidRowIndex + 1) + y + 1)).style.backgroundImage === 'url(img/project_resources/redDisc.png)') {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex + 1) + y + 1)).style.backgroundImage = 'url(img/project_resources/redDiscExplosion.jpg)';
                } else if (document.getElementById('game:Button' + (6 * (lastValidRowIndex + 1) + y + 1)).style.backgroundImage === 'url(img/project_resources/yellowDisc.png)') {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex + 1) + y + 1)).style.backgroundImage = 'url(img/project_resources/yellowDiscExplosion.jpg)';
                } else {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex + 1) + y + 1)).style.backgroundImage = 'url(img/project_resources/emptyDiscExplosion.jpg)';
                }
            }
            //explode above
            if (lastValidRowIndex > 0) {
                if (document.getElementById('game:Button' + (6 * (lastValidRowIndex - 1) + y + 1)).style.backgroundImage === 'url(img/project_resources/redDisc.png)') {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex - 1) + y + 1)).style.backgroundImage = 'url(img/project_resources/redDiscExplosion.jpg)';
                } else if (document.getElementById('game:Button' + (6 * (lastValidRowIndex - 1) + y + 1)).style.backgroundImage === 'url(img/project_resources/yellowDisc.png)') {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex - 1) + y + 1)).style.backgroundImage = 'url(img/project_resources/yellowDiscExplosion.jpg)';
                } else {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex - 1) + y + 1)).style.backgroundImage = 'url(img/project_resources/emptyDiscExplosion.jpg)';
                }
            }
            //explode left
            if (y < 5) {
                if (document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y + 1) + 1)).style.backgroundImage === 'url(img/project_resources/redDisc.png)') {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y + 1) + 1)).style.backgroundImage = 'url(img/project_resources/redDiscExplosion.jpg)';
                } else if (document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y + 1) + 1)).style.backgroundImage === 'url(img/project_resources/yellowDisc.png)') {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y + 1) + 1)).style.backgroundImage = 'url(img/project_resources/yellowDiscExplosion.jpg)';
                } else {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y + 1) + 1)).style.backgroundImage = 'url(img/project_resources/emptyDiscExplosion.jpg)';
                }
            }
            //explode right
            if (y > 0) {
                if (document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y - 1) + 1)).style.backgroundImage === 'url(img/project_resources/redDisc.png)') {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex) + y + 1)).style.backgroundImage = 'url(img/project_resources/redDiscExplosion.jpg)';
                } else if (document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y - 1) + 1)).style.backgroundImage === 'url(img/project_resources/yellowDisc.png)') {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y - 1) + 1)).style.backgroundImage = 'url(img/project_resources/yellowDiscExplosion.jpg)';
                } else {
                    document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y - 1) + 1)).style.backgroundImage = 'url(img/project_resources/emptyDiscExplosion.jpg)';
                }
            }
            await sleep(50);
            document.getElementById('game:Button' + (6 * (lastValidRowIndex) + y + 1)).style.backgroundImage = 'url(img/project_resources/emptyDisc.png)';
            if (y < 5) {
                document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y + 1) + 1)).style.backgroundImage = 'url(img/project_resources/emptyDisc.png)';
            }
            if (y > 0) {
                document.getElementById('game:Button' + (6 * (lastValidRowIndex) + (y - 1) + 1)).style.backgroundImage = 'url(img/project_resources/emptyDisc.png)';
            }
            if (lastValidRowIndex < 5) {
                document.getElementById('game:Button' + (6 * (lastValidRowIndex + 1) + y + 1)).style.backgroundImage = 'url(img/project_resources/emptyDisc.png)';
            }
            if (lastValidRowIndex > 0) {
                document.getElementById('game:Button' + (6 * (lastValidRowIndex - 1) + y + 1)).style.backgroundImage = 'url(img/project_resources/emptyDisc.png)';
            }
        }
        document.getElementById("Bomb").style.backgroundImage = 'url(img/project_resources/ExplosiveTile.jpg)';
        //unselect explosive tile
        document.getElementById("Normal").style.backgroundImage = 'url(img/project_resources/NormalTileSelected.jpg)';
        // select normal tile again
    }
    else if ((is_me && currentTile === 2) || (!is_me && currentTilePeer === 2)) {
        if(is_me)
            gTilesAvailable = false;
        if (amRed) {
            for (let i = 0; i <= 5; i++) {
                if (document.getElementById('game:Button' + (6 * i + y + 1)).style.backgroundImage === 'url("img/project_resources/emptyDisc.png")' && i <= x) {
                    lastValidRowIndex = i;
                    document.getElementById('game:Button' + (6 * i + y + 1)).style.backgroundImage = 'url(img/project_resources/redDisc.png)';
                    await sleep(sleepTime);
                    sleepTime = sleepTime - 7;
                    document.getElementById('game:Button' + (6 * i + y + 1)).style.backgroundImage = 'url(img/project_resources/emptyDisc.png)';
                } else {
                    break;
                }
            }
            if (lastValidRowIndex === -1) {
                //TODO repeat turn implementation?
                is_turn = !is_turn;
                launch_snackbar("Invalid Move!")
                return;
            }
            document.getElementById('game:Button' + (6 * lastValidRowIndex + y + 1)).style.backgroundImage = 'url(img/project_resources/redDisc.png)';
        } else {
            for (let i = 0; i <= 5; i++) {
                if (document.getElementById('game:Button' + (6 * i + y + 1)).style.backgroundImage === 'url("img/project_resources/emptyDisc.png")' && i <= x) {
                    lastValidRowIndex = i;
                    document.getElementById('game:Button' + (6 * i + y + 1)).style.backgroundImage = 'url(img/project_resources/yellowDisc.png)';
                    await sleep(sleepTime);
                    sleepTime = sleepTime - 7;
                    document.getElementById('game:Button' + (6 * i + y + 1)).style.backgroundImage = 'url(img/project_resources/emptyDisc.png)';
                } else {
                    break;
                }
            }
            if (lastValidRowIndex === -1) {
                //TODO repeat turn implementation?
                is_turn = !is_turn;
                launch_snackbar("Invalid Move!")
                return;
            }
            document.getElementById('game:Button' + (6 * lastValidRowIndex + y + 1)).style.backgroundImage = 'url(img/project_resources/yellowDisc.png)';
        }
        document.getElementById("Gravity").style.backgroundImage = 'url(img/project_resources/GravityTile.jpg)';
        //unselect explosive tile
        document.getElementById("Normal").style.backgroundImage = 'url(img/project_resources/NormalTileSelected.jpg)';
        // select normal tile again
    }
    if(is_me) {
        backend("gameProtocol peerButton " + x + "," + y + "," + currentTile);
        currentTile = 0;
    }
    if(checkDraw()){ //TODO why doesnt this work?
        onBackPressed()
        launch_snackbar("Draw (Game board full)")
    }
    evaluate_winner();
}
function checkDraw(){
    let continu=false;
    for(let i=0; i<=5; i++){
        if (document.getElementById("game:Button"+i+1).style.backgroundImage === 'url(img/project_resources/emptyDisc.png)'){
            continu=true;
        }
    }
    return !continu;
}

function peerButton(x, y, tile) {
    currentTilePeer = tile; //set for peer
    amRed = !amRed; //for peer
    pressButton(x, y, false);
    amRed = !amRed;
  }

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function onBackPressed() {
    if (overlayIsActive) {
        closeOverlay();
        return;
    }
    if (main_scenarios.indexOf(curr_scenario) >= 0) {
        if (curr_scenario === 'chats')
            backend("onBackPressed");
        else
            setScenario('chats')
    } else {
        if (curr_scenario === 'settings') {
            document.getElementById('div:settings').style.display = 'none';
            document.getElementById('core').style.display = null;
            document.getElementById('div:footer').style.display = null;
        }
        setScenario(prev_scenario);
    }
    backend("removeGame");
    reset_game();
    resetGameStartWindow();
}

function setScenario(new_scenario) {
    // console.log('setScenario ' + new_scenario)
    let list_of_elements = scenarioDisplay[new_scenario];
    if (list_of_elements) {
        // if (new_scenario != 'posts' && curr_scenario != "members" && curr_scenario != 'posts') {

        // Activate and deactivate the buttons in the footer
        if (scenarioDisplay[curr_scenario].indexOf('div:footer') >= 0) {
            let cl = document.getElementById('btn:' + curr_scenario).classList;
            cl.toggle('active', false);
            cl.toggle('passive', true);
        }
        // Cycle throw the list of elements and check against the list in
        // scenarioDisplay to display it or not
        display_or_not.forEach(function (gui_element) {
            // console.log(' l+' + gui_element);
            if (list_of_elements.indexOf(gui_element) < 0) {
                document.getElementById(gui_element).style.display = 'none';
            } else {
                document.getElementById(gui_element).style.display = null;
                // console.log(' l=' + gui_element);
            }
        })
        // Display the red TREMOLA title or another one
        if (new_scenario === "posts" || new_scenario === "settings") {
            document.getElementById('tremolaTitle').style.display = 'none';
            document.getElementById('conversationTitle').style.display = null;
        } else {
            document.getElementById('tremolaTitle').style.display = null;
            document.getElementById('conversationTitle').style.display = 'none';
        }
        if (main_scenarios.indexOf(new_scenario) >= 0) {
            prev_scenario = new_scenario;
        }
        curr_scenario = new_scenario;
        if (scenarioDisplay[curr_scenario].indexOf('div:footer') >= 0) {
            var cl = document.getElementById('btn:' + curr_scenario).classList;
            cl.toggle('active', true);
            cl.toggle('passive', false);
        }
    }
}

function btnBridge(element) {
    element = element.id;
    let menu = '';
    if (buttonList.indexOf(element) >= 0) {
        setScenario(element.substring(4));
    }
    if (element === 'btn:menu') {
        if (scenarioMenu[curr_scenario].length === 0)
            return;
        document.getElementById("menu").style.display = 'initial';
        document.getElementById("overlay-trans").style.display = 'initial';
        scenarioMenu[curr_scenario].forEach(function (e) {
            menu += "<button class=menu_item_button ";
            menu += "onclick='" + e[1] + "();'>" + e[0] + "</button><br>";
            console.log(`Scenario menu: ${menu}`);
        })
        menu = menu.substring(0, menu.length - 4);
        document.getElementById("menu").innerHTML = menu;

    }
    // if (typeof Android != "undefined") { Android.onFrontendRequest(element); }
}

function menu_settings() {
    closeOverlay();
    setScenario('settings')
    /*
    prev_scenario = curr_scenario;
    curr_scenario = 'settings';
    document.getElementById('core').style.display = 'none';
    document.getElementById('div:footer').style.display = 'none';
    document.getElementById('div:settings').style.display = null;

    document.getElementById("tremolaTitle").style.display = 'none';
    */
    var c = document.getElementById("conversationTitle");
    c.style.display = null;
    c.innerHTML = "<div style='text-align: center;'><font size=+1><strong>Settings</strong></font></div>";
}

function closeOverlay() {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('qr-overlay').style.display = 'none';
    document.getElementById('preview-overlay').style.display = 'none';
    document.getElementById('new_chat-overlay').style.display = 'none';
    document.getElementById('new_contact-overlay').style.display = 'none';
    document.getElementById('confirm_contact-overlay').style.display = 'none';
    document.getElementById('overlay-bg').style.display = 'none';
    document.getElementById('overlay-trans').style.display = 'none';
    document.getElementById('about-overlay').style.display = 'none';
    document.getElementById('edit-overlay').style.display = 'none';
    document.getElementById('old_contact-overlay').style.display = 'none';
    overlayIsActive = false;
}

function showPreview() {
    var draft = escapeHTML(document.getElementById('draft').value);
    if (draft.length === 0) return;
    if (!getSetting("enable_preview")) {
        new_post(draft);
        return;
    }
    var draft2 = draft.replace(/\n/g, "<br>\n");
    var to = recps2display(tremola.chats[curr_chat].members)
    document.getElementById('preview').innerHTML = "To: " + to + "<hr>" + draft2 + "&nbsp;<hr>";
    var s = document.getElementById('preview-overlay').style;
    s.display = 'initial';
    s.height = '80%'; // 0.8 * docHeight;
    document.getElementById('overlay-bg').style.display = 'initial';
    overlayIsActive = true;
}

function menu_about() {
    closeOverlay()
    document.getElementById('about-overlay').style.display = 'initial';
    document.getElementById('overlay-bg').style.display = 'initial';
    overlayIsActive = true;
}

function plus_button() {
    closeOverlay();
    if (curr_scenario === 'chats') {
        menu_new_conversation();
    } else if (curr_scenario === 'contacts') {
        menu_new_contact();
    } else if (curr_scenario === 'connex') {
        menu_new_pub();
    }
}

function launch_snackbar(txt) {
    var sb = document.getElementById("snackbar");
    sb.innerHTML = txt;
    sb.className = "show";
    setTimeout(function () {
        sb.className = sb.className.replace("show", "");
    }, 3000);
}

// --- QR display and scan

function showQR() {
    generateQR('did:ssb:ed25519:' + myId.substring(1).split('.')[0])
}

function generateQR(s) {
    document.getElementById('qr-overlay').style.display = 'initial';
    document.getElementById('overlay-bg').style.display = 'initial';
    document.getElementById('qr-text').innerHTML = s;
    if (!qr) {
        var w, e, arg;
        w = window.getComputedStyle(document.getElementById('qr-overlay')).width;
        w = parseInt(w, 10);
        e = document.getElementById('qr-code');
        arg = {
            height: w,
            width: w,
            text: s,
            correctLevel: QRCode.CorrectLevel.M // L, M, Q, H
        };
        qr = new QRCode(e, arg);
    } else {
        qr.clear();
        qr.makeCode(s);
    }
    overlayIsActive = true;
}

function qr_scan_start() {
    // test if Android is defined ...
    backend("qrscan.init");
    closeOverlay();
}

function qr_scan_success(s) {
    closeOverlay();
    var t = "did:ssb:ed25519:";
    if (s.substring(0, t.length) === t) {
        s = '@' + s.substring(t.length) + '.ed25519';
    }
    var b = '';
    try {
        b = atob(s.substr(1, s.length - 9));
        // FIXME we should also test whether it is a valid ed25519 public key ...
    } catch (err) {
    }
    if (b.length !== 32) {
        launch_snackbar("unknown format or invalid identity");
        return;
    }
    new_contact_id = s;
    // console.log("tremola:", tremola)
    if (new_contact_id in tremola.contacts) {
        launch_snackbar("This contact already exists");
        return;
    }
    // FIXME: do sanity tests
    menu_edit('new_contact_alias', "Assign alias to new contact:<br>(only you can see this alias)", "");
}

function qr_scan_failure() {
    launch_snackbar("QR scan failed")
}

function qr_scan_confirmed() {
    var a = document.getElementById('alias_text').value;
    var s = document.getElementById('alias_id').innerHTML;
    // c = {alias: a, id: s};
    var i = (a + "?").substring(0, 1).toUpperCase()
    var c = {"alias": a, "initial": i, "color": colors[Math.floor(colors.length * Math.random())]};
    tremola.contacts[s] = c;
    persist();
    backend("add:contact " + s + " " + btoa(a))
    load_contact_item([s, c]);
    closeOverlay();
}

/**
 * Check that entered ShortName follows the correct pattern.
 * Upper cases are accepted, and the minus in 6th position is optional.
 * We use z-base32: char '0', 'l', 'v' and '2' are replaced with
 * 'o', '1', 'u' and 'z' for less confusion.
 */
function look_up(shortname) {
    const shortnameLength = 10; // Cannot be coded into the regEx
    console.log(`shortname: ${shortname}`)
    shortname = shortname.toLowerCase()
        .replace(/0/g, "o")
        .replace(/l/g, "1")
        .replace(/v/g, "u")
        .replace(/2/g, "z");

    if (shortname.search("^[a-z1-9]{5}[a-z1-9]{5}$") !== -1)
        shortname = shortname.slice(0, shortnameLength / 2) + '-' + shortname.slice(shortnameLength / 2, shortnameLength)
    if (shortname.search("^[a-z1-9]{5}-[a-z1-9]{5}$") !== -1) {
        closeOverlay()
        backend("look_up " + shortname);
    } else {
        launch_snackbar(`"${shortname}" is not a valid Shortname`)
    }
}

// ---
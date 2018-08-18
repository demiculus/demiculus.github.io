var arapcaHarfler = ["elif","be","te","the","cim","çim","ha","xa","dal","zel","re",
                     "ze","je","sin","şin","sad","dad","ta","za","ayn","gayn","fe",
                     "kaf","kef","gef","nef","lam","mim","nun","he","vav","ye","te_marbuta",
                     "elif_hemze_ust","elif_hemze_alt","elif_madde","hemze","elif_maksure",
                     "ye_hemze_ust","tenvin","shedde"];

var transliterationDict = {"elif":"ä","be":"b", "te":"t", "the":"þ", "cim":"c",
                           "çim":"ç","ha":"h́","xa":"x",
                           "dal":"d", "zel":"ⱬ", "re":"r","ze":"z","je":"j","sin":"s",
                           "şin":"ş","sad":"ś","dad":"ɖ","ta":"t́","za":"ź","ayn":"ø",
                           "gayn":"ğ","fe":"f","kaf":"ḱ","kef":"k","gef":"g","nef":"ŋ",
                           "lam":"l","mim":"m",
                           "nun":"n","he":"h","vav":"v","ye":"i","te_marbuta":"ät",
                           "elif_hemze_ust":"'ä", "elif_hemze_alt":"i", "elif_madde":"'aa",
                           "hemze":"'","elif_maksure":"a","ye_hemze_ust":"'i","tenvin":"n",
                           "shedde":""};

var letterDict = {"elif":"ا","be":"ب","te":"ت","the":"ث","cim":"ج","çim":"چ","ha":"ح","xa":"خ",
                  "dal":"د","zel":"ذ","re":"ر","ze":"ز","je":"ژ‎","sin":"س","şin":"ش",
                  "sad":"ص","dad":"ض","ta":"ط","za":"ظ","ayn":"ع","gayn":"غ",
                  "fe":"ف","kaf":"ق","kef":"ك","gef":"گ","nef":"ڭ","lam":"ل","mim":"م","nun":"ن",
                  "he":"ه","vav":"و","ye":"ي","te_marbuta":"ة","elif_hemze_ust":"أ",
                  "elif_hemze_alt":"إ", "elif_madde":"آ", "hemze":"ء",
                  "elif_maksure":"ى","ye_hemze_ust":"ئ","tenvin":"ً","shedde":"ّ"};

var punctDict = {"،":","};

var invert = function (obj) {
    var new_obj = {};
    for (var prop in obj) {
        if(obj.hasOwnProperty(prop)) {
            new_obj[obj[prop]] = prop;
        }
    }
    return new_obj;
};

invLetterDict = invert(letterDict);

function arapcaUnsuzdenTurkceUnsuze(harf) {
    return transliterationDict[harf];
}

function getButunTuretmeler(kok, kaliplar){
    var result = [];
    for(var i = 0; i < kaliplar.length; i++) {
        result.push(kok.getTuretme(kaliplar[i]));
    }
    return result;
}

function Kok (arapcaKok) {
    this.legit = true;
    if (arapcaKok.length != 3){
        this.legit = false;
    }
    for(var i = 0; i < arapcaKok.length; i++) {
        if ($.inArray(arapcaKok[i], arapcaHarfler)===-1){
            this.legit = false;
        }
    }

    this.arapcaKok = arapcaKok;

    this.getTurkceKok = function() {
        this.turkceKok = [];
        for (var i=0; i < this.arapcaKok.length; i++){
            this.turkceKok.push(arapcaUnsuzdenTurkceUnsuze(arapcaKok[i]));
        }
        // if (this.turkceKok[1] == "v") {
        //     this.turkceKok[1] = "i";
        //     // this.turkceKok[1] = "ä";
        // }
        return this.turkceKok;
    }
    this.getTurkceKok();

    this.getArapcaKok = function(){
        return this.arapcaKok;
    }

    this.getArapHarfliKok = function(){
        this.arapHarfliKok = [];
        for (var i = 0; i < this.arapcaKok.length; i++) {
            this.arapHarfliKok.push(letterDict[this.arapcaKok[i]]);
        }
        return this.arapHarfliKok;
    }
    this.getArapHarfliKok();

    this.getTuretme = function(kalip){
        var chars = kalip.split("");
        var result = "";
        for(var i = 0; i < chars.length; i++) {
            if (chars[i] == "N") {
                result += this.turkceKok[0];
            } else if (chars[i] == "C") {
                result += this.turkceKok[1];
            } else if (chars[i] == "Z") {
                result += this.turkceKok[2];
            } else {
                result += chars[i];
            }
        }
        // result = turkify(result);
        return result;
    }
}

function listToString(l){
    var s = ""
    for(var i = 0; i < l.length; i++) {
        s += l[i] + delim;
    }
    s = s.substring(0, s.length - delim.length);
    return s;
}


function createTableFrom2dArray(tableId, tableData) {
    // var table = document.createElement('table');
    var table = document.getElementById(tableId);
    var tableHead = document.createElement('thead'),
        tableBody = document.createElement('tbody');
    // table.id = "resultTable";
    table.className = "table table-striped table-hover";

    var row = document.createElement('tr');

    tableData[0].forEach(function(cellData) {
        var cell = document.createElement('th');
        cell.appendChild(document.createTextNode(cellData));
        row.appendChild(cell);
    });
    tableHead.appendChild(row);
    tableData.shift();

    tableData.forEach(function(rowData) {
        var row = document.createElement('tr');

        rowData.forEach(function(cellData) {
            var cell = document.createElement('td');
            cell.appendChild(document.createTextNode(cellData));
            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });

    table.appendChild(tableHead);
    table.appendChild(tableBody);
}

function strTo1dArray(str){
    var result = [];
    str = str.split('\n');
    for(var i = 0; i < str.length; i++) {
        var b = str[i].split("//")[0];
        b = b.replace(/ /g,'');
        if (b != "")
            result.push(b);
    }
    return result;
}

function strTo2dArray(str){
    var result = [];
    str = str.split('\n');
    for(var i = 0; i < str.length; i++) {
        var b = (str[i]).replace(/ /g,'').split(',');
        if (b.length === 3) {
            result.push(b);
        }
    }
    return result;
}


function isle(kokListesi, kaliplar) {
    var analiste = [];
    kokListesi.unshift(["nun","cim","ze"]);
    for (var i = 0; i < kokListesi.length; i++) {
        var kok = new Kok(kokListesi[i]);
        if (!kok.legit) {
            continue;
        }
        var kelimeler = [];
        kelimeler.push(listToString(kok.getArapHarfliKok(),delim=""));
        kelimeler.push(listToString(kok.getArapcaKok(),delim=" . "));
        kelimeler.push(listToString(kok.getTurkceKok(),delim=" . "));
        kelimeler = kelimeler.concat(getButunTuretmeler(kok, kaliplar));
        analiste.push(kelimeler);
    }
    return analiste;
}

function getTransliterlemeArray() {
    var result = [];
    var row = [];
    for(var i = 0; i < arapcaHarfler.length; i++) {
        row.push(letterDict[arapcaHarfler[i]]);
    }
    result.push(row); row = [];
    for(var i = 0; i < arapcaHarfler.length; i++) {
        row.push(arapcaHarfler[i]);
    }
    result.push(row); row = [];
    for(var i = 0; i < arapcaHarfler.length; i++) {
        row.push(transliterationDict[arapcaHarfler[i]]);
    }
    result.push(row);
    return result;
}


function blindTransliterate(iText) {
    result = "";
    for (var i = 0, len = iText.length; i < len; i++) {
        c = iText[i];
        if (invLetterDict[c]) {
            result += transliterationDict[invLetterDict[c]];
        } else if (punctDict[c]) {
            result += punctDict[c];
        } else {
            result += c;
        }
    }
    return result;
}

function fonetiktenOnerileneCevir(iText) {
    result = "";
    for (var i = 0, len = iText.length; i < len; i++) {
        c = iText[i];
        if (c === "ä") {
            result += "e";
        } else if (c === "ø") {
            result += "o";
        } else if (c === "h́") {
            result += "h";
        } else {
            result += c;
        }
    }
    return result;
}

// kokList = strTo2dArray("kokList");
// document.getElementById("mainInput").innerHTML = document.getElementById("kokList").innerHTML

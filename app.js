//===================================================================================================================
//--- BUDGET CONTROLLER
var budgetController = (function () {

    // privát: költség osztály
    var Expense = function (id, description, value) {
        this.id = id;
        this.description = description;
        this.value = value;
        this.percentage = -1;
    };

    Expense.prototype.calculatePercentage = function (totalIncome) {
        if (totalIncome > 0) {
            this.percentage = Math.round((this.value / totalIncome) * 100);
        } else {
            this.percentage = -1;
        }
    };

    Expense.prototype.getPercentage = function () {
        return this.percentage;
    };

    // privát: bevétel osztály
    var Income = function (id, description, value) {
        this.id = id;
        this.description = description;
        this.value = value;
    };

    // privát: globális adat modell
    var data = {
        allItems: {
            exp: [],
            inc: []
        },
        totals: {
            exp: 0,
            inc: 0
        },
        budget: 0,
        percentage: -1
    };

    // privát: szumma számolása
    var calculateTotal = function (type) {
        var sum = 0;
        data.allItems[type].forEach(function (cur) {
            sum += cur.value;
        });
        data.totals[type] = sum;
    };

    // publikus osztályok
    return {
        addItem: function (type, des, val) { // publikus: elem hozzáadása
            var newItem, ID;

            if (data.allItems[type].length > 0) {

                // ID készítés: megszámolja, hogy hány elem van már, és ennek megfelelően állítja be az ID-t.
                ID = data.allItems[type][data.allItems[type].length - 1].id + 1;
            } else {
                ID = 0; // a legelső elem 0 ID-t kap.
            }

            // elkészíti az új exp vagy inc elemet
            if (type === 'exp') {
                newItem = new Expense(ID, des, val);
            } else if (type === 'inc') {
                newItem = new Income(ID, des, val);
            }

            // feltolja az adatstruktúrába
            data.allItems[type].push(newItem);

            // visszaadja az új elemet
            return newItem;
        },

        deleteItem: function (type, id) {
            var ids, index;
            //data.allItems[type][id]; ez nem működik, mert a tömbben elfoglalt index nem feltétlenül egyezik meg az id-vel.

            // a map visszaad egy új tömböt, ami tartalmazza az id-ket
            ids = data.allItems[type].map(function (current) {
                return current.id;
            });
            // megkeresi az adott ID-jű elemet a tömbben
            index = ids.indexOf(id);

            // ha létezik, akkor kitörli a tömbből.
            if (index !== -1) {
                data.allItems[type].splice(index, 1);
            }
        },

        calculateBudget: function () { // publikus: budget számolása

            // össz bevétel és össz kiadás kiszámolása
            calculateTotal('exp');
            calculateTotal('inc');

            // egyenleg kiszámítása: bevétel - kiadás
            data.budget = data.totals.inc - data.totals.exp;

            // százalékos költségek számítása a bevétel alapján
            if (data.totals.inc > 0) { // nullával nem oszt
                data.percentage = Math.round((data.totals.exp / data.totals.inc) * 100);
            } else {
                data.percentage = -1; // ha nincs bevétel, akkor -1-et ad vissza
            }

        },

        calculatePercentages: function () {

            data.allItems.exp.forEach(function (cur) {
                cur.calculatePercentage(data.totals.inc);
            });

        },

        getPercentages: function () {
            var allPercentages = data.allItems.exp.map(function (cur) {
                return cur.getPercentage();
            });
            return allPercentages;
        },

        // visszaadja az értékeket egy objektumban
        getBudget: function () {
            return {
                budget: data.budget,
                totalInc: data.totals.inc,
                totalExp: data.totals.exp,
                percent: data.percentage
            }
        },

        testing: function () { // publikus: console-os teszteléshez
            console.log(data);
        }
    };

})();

//===================================================================================================================
//--- UI CONTROLLER
var UIController = (function () {

    // DOM elnevezések listája
    var DOMstrings = {
        inputType: '.add__type',
        inputDescription: '.add__description',
        inputValue: '.add__value',
        inputBtn: '.add__btn',
        incomeContainer: '.income__list',
        expenseContainer: '.expenses__list',
        budgetLabel: '.budget__value',
        incomeLabel: '.budget__income--value',
        expenseLabel: '.budget__expenses--value',
        percentageLabel: '.budget__expenses--percentage',
        container: '.container',
        expensesPercLabel: '.item__percentage',
        dateLabel: '.budget__title--month'
    };

    var formatNumber = function (num, type) {
        var numSplit, int, dec;

        num = Math.abs(num);

        // 2 százalékpontos megjelenítés (string-et ad vissza)
        num = num.toFixed(2);

        // 1 000 érték szóközökkel
        numSplit = num.split('.');

        int = numSplit[0];
        if (int.length > 3) {
            int = int.substr(0, int.length - 3) + ' ' + int.substr(int.length - 3, int.length);
        }

        dec = numSplit[1];

        // + vagy - a számok elé

        return (type === 'exp' ? '-' : '+') + ' ' + int + '.' + dec;

    };

    // foreach helper: funkció végrehajtása a tömb tagjain.
    var nodeListForEach = function (list, callback) {
        for (var i = 0; i < list.length; i++) {
            callback(list[i], i);
        }
    };

    // UI controller publikus metódusok
    return {

        // begyűjti a beírt adatokat.
        getInput: function () {
            return {
                type: document.querySelector(DOMstrings.inputType).value, // inc vagy exp lehet
                description: document.querySelector(DOMstrings.inputDescription).value,
                value: parseFloat(document.querySelector(DOMstrings.inputValue).value)
            };
        },

        // bevételi és kiadási tételek megjelenítése
        addListItem: function (obj, type) {
            var html, newHtml, element;

            // HTML placeholder stringek készítése
            if (type === 'inc') {
                element = DOMstrings.incomeContainer;
                html = '<div class="item clearfix" id="inc-%id%"> <div class="item__description">%description%</div><div class="right clearfix"><div class="item__value">%value%</div><div class="item__delete"><button class="item__delete--btn"><i class="ion-ios-close-outline"></i></button></div></div></div>';
            } else if (type === 'exp') {
                element = DOMstrings.expenseContainer;
                html = '<div class="item clearfix" id="exp-%id%"><div class="item__description">%description%</div><div class="right clearfix"><div class="item__value">%value%</div><div class="item__percentage">21%</div><div class="item__delete"><button class="item__delete--btn"><i class="ion-ios-close-outline"></i></button></div></div></div>';
            }

            // A placeholderek lecserélése az aktuális adatokra
            newHtml = html.replace('%id%', obj.id);
            newHtml = newHtml.replace('%description%', obj.description);
            newHtml = newHtml.replace('%value%', formatNumber(obj.value, type));

            // A HTML beszúrása a DOM-ba
            // help --- https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML
            document.querySelector(element).insertAdjacentHTML('beforeend', newHtml);
        },

        deleteListItem: function (selectorID) {
            var el = document.getElementById(selectorID);
            el.parentNode.removeChild(el);

        },

        // Az input mezők alaphelyzetbe állítása
        clearFields: function () {
            var fields, fieldsArr;
            fields = document.querySelectorAll(DOMstrings.inputDescription + ', ' + DOMstrings.inputValue);

            var fieldsArr = Array.prototype.slice.call(fields); // a listát tömbbé alakítja

            fieldsArr.forEach(function (current, index, array) {
                current.value = "";
            });

        },

        // fejléc elemeinek megjelenítése
        displayBudget: function (obj) {

            obj.budget > 0 ? type = 'inc' : type = 'exp';

            document.querySelector(DOMstrings.budgetLabel).textContent = formatNumber(obj.budget, type);
            document.querySelector(DOMstrings.incomeLabel).textContent = formatNumber(obj.totalInc, 'inc');
            document.querySelector(DOMstrings.expenseLabel).textContent = formatNumber(obj.totalExp, 'exp');

            if (obj.percent > 0) {
                document.querySelector(DOMstrings.percentageLabel).textContent = obj.percent + '%';
            } else {
                document.querySelector(DOMstrings.percentageLabel).textContent = '---'
            }
        },

        // megkapja a százalékokat tömbben, és megjeleníti az összes elemen az értékeket
        displayPercentages: function (percentages) {

            var fields = document.querySelectorAll(DOMstrings.expensesPercLabel);

            nodeListForEach(fields, function (current, index) {
                if (percentages[index] > 0) {
                    current.textContent = percentages[index] + '%';
                } else {
                    current.textContent = '---';
                }
            });
        },

        // idő megjelenítése
        displayMonth: function () {
            var now, year, month, months;
            months = ['Januárjában', 'Februárjában', 'Márciusában', 'Áprilisában', 'Májusában', 'Júniusában', 'Júliusában', 'Augusztusában', 'Szeptemberében', 'Októberében', 'Novemberében', 'Decemberében'];
            now = new Date();
            // var christmas = new Date(2018, 11, 25);
            year = now.getFullYear();
            month = now.getMonth();
            document.querySelector(DOMstrings.dateLabel).textContent = year + ' ' + months[month];
        },

        // a beviteli mezők keretszínének megváltoztatása
        changedType: function () {

            var fields = document.querySelectorAll(
                DOMstrings.inputType + ',' +
                DOMstrings.inputDescription + ',' +
                DOMstrings.inputValue
            );

            nodeListForEach(fields, function(cur) {
                cur.classList.toggle('red-focus');
            });

            // gomb színének megváltoztatása
            document.querySelector(DOMstrings.inputBtn).classList.toggle('red');
        },

        // a DOMstrings változók publikussá tétele
        getDomstrings: function () {
            return DOMstrings;
        }
    };
})();

//===================================================================================================================
//--- GLOBAL APP CONTROLLER
var controller = (function (budgetCtrl, UICtrl) {

    // eseménykezelők gyűjteménye
    var setupEventListeners = function () {
        var DOM = UICtrl.getDomstrings(); // behívja a DOM elemeket

        // a gomb megnyomása meghívja a ctrlAddItem függvényt.
        document.querySelector(DOM.inputBtn).addEventListener('click', ctrlAddItem);

        // az enter leütése meghívja a ctrlAddItem függvényt.
        document.addEventListener('keypress', function (event) {
            // console.log(event);
            if (event.keyCode === 13 || event.witch === 13) {
                // console.log('Entert nyomtál!');
                ctrlAddItem();
            }
        });

        // esemény delegáció az elemek törléséhez
        document.querySelector(DOM.container).addEventListener('click', ctrlDeleteItem);
        // kijelölés a beviteli mezők keretszínének megváltoztatásához
        document.querySelector(DOM.inputType).addEventListener('change', UICtrl.changedType);
    };

    // Fejléc elemeinek frissítése
    var updateBudget = function () {

        //- 1. Kiszámoltatja a Budgetet
        budgetCtrl.calculateBudget();

        //- 2. Lekérdezi a Budget értékeit.
        var budget = budgetCtrl.getBudget();

        //- 3. Megjeleníti az értékeket.
        //console.log(budget);
        UICtrl.displayBudget(budget);

    };

    var updatePercentages = function () {
        // 1. Százalék számíttatás
        budgetCtrl.calculatePercentages();

        // 2. Százalék beolvasása a budget controllerből
        var percentages = budgetCtrl.getPercentages();

        // 3. Az UI frissítése az új százalékkal
        //console.log(percentages);
        UICtrl.displayPercentages(percentages);
    };

    // tétel elemek megjelenítése
    var ctrlAddItem = function () {
        //console.log('Működik!');
        var input, newItem;

        //- 1. Beadott adatok felvétele
        input = UICtrl.getInput();
        //console.log(input);

        // validálás
        if (input.description !== "" && !isNaN(input.value) && input.value > 0) {

            //- 2. Elemek átadása a Budget controllernek
            newItem = budgetCtrl.addItem(input.type, input.description, input.value);

            //- 3. Elemek hozzáadása az UI-hoz.
            UICtrl.addListItem(newItem, input.type);

            //- 4. Kiüríti a beviteli mezőket.
            UICtrl.clearFields();

            //- 5. Kiszámolja és frissíti a Budget-et.
            updateBudget();

            //- 6. kiszámolja és frissíti a százalékokat.
            updatePercentages();
        }

    };

    // elemek törlése
    var ctrlDeleteItem = function (event) {

        var itemID, splitID, type, ID;
        // DOM Traversing  
        // console.log(event.target.parentNode.parentNode.parentNode.parentNode.id);
        itemID = event.target.parentNode.parentNode.parentNode.parentNode.id;

        // csak a keresett elemnek van egyedül ID-ja.
        if (itemID) {
            splitID = itemID.split('-');
            type = splitID[0];
            ID = parseInt(splitID[1]);
        }

        // 1. Az elem törlése az adatstruktúrából
        budgetController.deleteItem(type, ID);

        // 2. Az elem törlése az UI-ról
        UICtrl.deleteListItem(itemID);

        // 3. A Budget frissítése és megjelenítése
        updateBudget();

        // 4. kiszámolja és frissíti a százalékokat.
        updatePercentages();

    };

    return { // a setupEventListeners függvény pulikussá tétele.
        init: function () {
            //console.log('Az alkalmazás elindult.');

            setupEventListeners();
            UICtrl.displayMonth();
            UICtrl.displayBudget({
                budget: 0,
                totalInc: 0,
                totalExp: 0,
                percent: -1
            });
        }
    };

})(budgetController, UIController);

//===================================================================================================================

controller.init();
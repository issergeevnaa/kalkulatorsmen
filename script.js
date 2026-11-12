document.addEventListener('DOMContentLoaded', function () {
    var pvzList = [
        { name: "Бульвар Великой Победы 13", rate: 1500 },
        { name: "Индустриальная 12 б", rate: 2000 },
        { name: "Мира 8А", rate: 1800 },
        { name: "Ленинградская 1В", rate: 1800 },
        { name: "Бульвар Великой Победы 45", rate: 1800 },
        { name: "Маршала Кошевого 23в", rate: 1800 },
        { name: "Энтузиастов 14", rate: 1800 },
        { name: "Энтузиастов 19", rate: 1800 },
        { name: "Черникова 1Б", rate: 1800 },
        { name: "Курчатова 35а", rate: 1800 }
    ];

    var scheduledDays = new Set();
    var skippedDays = new Set();
    var extraDays = new Set();

    var pvzSelect = document.getElementById('pvzSelect');
    var baseRateInput = document.getElementById('baseRate');
    var monthSelect = document.getElementById('monthSelect');
    var firstShiftDay = document.getElementById('firstShiftDay');
    var scheduleType = document.getElementById('scheduleType');
    var hadDaysOff = document.getElementById('hadDaysOff');
    var daysOffHint = document.getElementById('daysOffHint');
    var resetScheduleBtn = document.getElementById('resetScheduleBtn');
    var calendarGrid = document.getElementById('calendarGrid');

    var enableSubs = document.getElementById('enableSubs');
    var subsSection = document.getElementById('subsSection');
    var subsList = document.getElementById('subsList');
    var addSubBtn = document.getElementById('addSubBtn');

    function init() {
        pvzList.forEach(function (pvz, index) {
            var option = document.createElement('option');
            option.value = index;
            option.textContent = pvz.name; // Только название ПВЗ без ставки
            pvzSelect.appendChild(option);
        });

        var now = new Date();
        var year = now.getFullYear();
        var month = String(now.getMonth() + 1).padStart(2, '0');
        monthSelect.value = year + '-' + month;

        baseRateInput.value = pvzList.at(0).rate;

        generateSchedule();
    }

    function generateSchedule() {
        scheduledDays.clear();
        skippedDays.clear();
        extraDays.clear();

        if (!monthSelect.value) return;

        var parts = monthSelect.value.split('-');
        var year = parseInt(parts.at(0), 10);
        var month = parseInt(parts.at(1), 10);
        var daysInMonth = new Date(year, month, 0).getDate();

        var startDay = parseInt(firstShiftDay.value, 10) || 1;
        if (startDay < 1) startDay = 1;
        if (startDay > daysInMonth) startDay = daysInMonth;

        var workDays = scheduleType.value === '2/2' ? 2 : 3;
        var cycleLength = workDays * 2;

        for (var day = startDay; day <= daysInMonth; day++) {
            var diff = day - startDay;
            if (diff % cycleLength < workDays) {
                scheduledDays.add(day);
            }
        }

        renderCalendar();
        calculateSalary();
    }

    function renderCalendar() {
        calendarGrid.innerHTML = '';
        var parts = monthSelect.value.split('-');
        var year = parseInt(parts.at(0), 10);
        var month = parseInt(parts.at(1), 10);
        var daysInMonth = new Date(year, month, 0).getDate();

        var firstDayOfWeek = new Date(year, month - 1, 1).getDay();
        if (firstDayOfWeek === 0) firstDayOfWeek = 7;

        for (var i = 1; i < firstDayOfWeek; i++) {
            var emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty';
            calendarGrid.appendChild(emptyCell);
        }

        for (var day = 1; day <= daysInMonth; day++) {
            (function (currentDay) {
                var dayCell = document.createElement('div');
                dayCell.className = 'calendar-day';
                dayCell.textContent = currentDay;

                var isScheduled = scheduledDays.has(currentDay);
                var isSkipped = skippedDays.has(currentDay);
                var isExtra = extraDays.has(currentDay);

                if ((isScheduled && !isSkipped) || isExtra) {
                    dayCell.classList.add('active');
                    dayCell.classList.add(currentDay <= 15 ? 'half-1' : 'half-2');
                } else if (isScheduled && isSkipped) {
                    dayCell.className = 'calendar-day day-off';
                    dayCell.title = 'Выходной в рабочую смену';
                }

                dayCell.addEventListener('click', function () {
                    if (scheduledDays.has(currentDay)) {
                        if (skippedDays.has(currentDay)) {
                            skippedDays.delete(currentDay);
                        } else {
                            skippedDays.add(currentDay);
                            hadDaysOff.checked = true;
                            daysOffHint.style.display = 'block';
                        }
                    } else {
                        if (extraDays.has(currentDay)) {
                            extraDays.delete(currentDay);
                        } else {
                            extraDays.add(currentDay);
                        }
                    }
                    renderCalendar();
                    calculateSalary();
                });

                calendarGrid.appendChild(dayCell);
            })(day);
        }
    }

    function addSubRow() {
        var row = document.createElement('div');
        row.className = 'sub-row';

        var select = document.createElement('select');
        select.className = 'sub-pvz';
        pvzList.forEach(function (pvz, idx) {
            var opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = pvz.name; // Только название ПВЗ без ставки
            select.appendChild(opt);
        });

        var inputH1 = document.createElement('input');
        inputH1.type = 'number';
        inputH1.min = '0';
        inputH1.placeholder = '0';
        inputH1.className = 'sub-h1';

        var inputH2 = document.createElement('input');
        inputH2.type = 'number';
        inputH2.min = '0';
        inputH2.placeholder = '0';
        inputH2.className = 'sub-h2';

        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'btn-del';
        delBtn.innerHTML = '&times;';
        delBtn.title = 'Удалить';

        row.appendChild(select);
        row.appendChild(inputH1);
        row.appendChild(inputH2);
        row.appendChild(delBtn);

        select.addEventListener('change', calculateSalary);
        inputH1.addEventListener('input', calculateSalary);
        inputH2.addEventListener('input', calculateSalary);
        delBtn.addEventListener('click', function () {
            row.remove();
            calculateSalary();
        });

        subsList.appendChild(row);
    }

    function calculateSalary() {
        var baseRate = parseFloat(baseRateInput.value) || 0;
        var mainShiftsH1 = 0;
        var mainShiftsH2 = 0;

        var parts = monthSelect.value.split('-');
        var daysInMonth = new Date(parseInt(parts.at(0), 10), parseInt(parts.at(1), 10), 0).getDate();

        for (var day = 1; day <= daysInMonth; day++) {
            var worked = (scheduledDays.has(day) && !skippedDays.has(day)) || extraDays.has(day);
            if (worked) {
                if (day <= 15) mainShiftsH1++;
                else mainShiftsH2++;
            }
        }

        var mainPayH1 = mainShiftsH1 * baseRate;
        var mainPayH2 = mainShiftsH2 * baseRate;

        var subShiftsH1 = 0;
        var subShiftsH2 = 0;
        var subPayH1 = 0;
        var subPayH2 = 0;

        if (enableSubs.checked) {
            var subRows = document.querySelectorAll('.sub-row');
            subRows.forEach(function (row) {
                var pvzIndex = parseInt(row.querySelector('.sub-pvz').value, 10);
                var subRate = pvzList.at(pvzIndex).rate + 100;
                var countH1 = parseInt(row.querySelector('.sub-h1').value, 10) || 0;
                var countH2 = parseInt(row.querySelector('.sub-h2').value, 10) || 0;

                subShiftsH1 += countH1;
                subShiftsH2 += countH2;
                subPayH1 += countH1 * subRate;
                subPayH2 += countH2 * subRate;
            });
        }

        var totalH1 = mainPayH1 + subPayH1;
        var totalH2 = mainPayH2 + subPayH2;
        var totalMonth = totalH1 + totalH2;

        document.getElementById('shiftsHalf1').textContent = (mainShiftsH1 + subShiftsH1) + ' смен';
        document.getElementById('detailsHalf1').textContent = 'Основных: ' + mainPayH1.toLocaleString('ru-RU') + ' ₽ | Подмен: ' + subPayH1.toLocaleString('ru-RU') + ' ₽';
        document.getElementById('sumHalf1').textContent = totalH1.toLocaleString('ru-RU') + ' ₽';

        document.getElementById('shiftsHalf2').textContent = (mainShiftsH2 + subShiftsH2) + ' смен';
        document.getElementById('detailsHalf2').textContent = 'Основных: ' + mainPayH2.toLocaleString('ru-RU') + ' ₽ | Подмен: ' + subPayH2.toLocaleString('ru-RU') + ' ₽';
        document.getElementById('sumHalf2').textContent = totalH2.toLocaleString('ru-RU') + ' ₽';

        var allShifts = mainShiftsH1 + mainShiftsH2 + subShiftsH1 + subShiftsH2;
        document.getElementById('totalShifts').textContent = 'Всего отработано: ' + allShifts + ' смен';
        document.getElementById('totalSum').textContent = totalMonth.toLocaleString('ru-RU') + ' ₽';
    }

    pvzSelect.addEventListener('change', function (e) {
        var idx = parseInt(e.target.value, 10);
        baseRateInput.value = pvzList.at(idx).rate;
        calculateSalary();
    });

    baseRateInput.addEventListener('input', calculateSalary);
    monthSelect.addEventListener('change', generateSchedule);
    firstShiftDay.addEventListener('input', generateSchedule);
    scheduleType.addEventListener('change', generateSchedule);
hadDaysOff.addEventListener('change', function (e) {
daysOffHint.style.display = e.target.checked ? 'block' : 'none';
if (!e.target.checked) {
skippedDays.clear();
renderCalendar();
calculateSalary();
}
});
resetScheduleBtn.addEventListener('click', function () {
hadDaysOff.checked = false;
daysOffHint.style.display = 'none';
generateSchedule();
});
enableSubs.addEventListener('change', function (e) {
subsSection.style.display = e.target.checked ? 'block' : 'none';
if (e.target.checked && subsList.children.length === 0) {
addSubRow();
}
calculateSalary();
});
addSubBtn.addEventListener('click', addSubRow);
init();
});

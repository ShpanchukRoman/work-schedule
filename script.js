document.addEventListener('DOMContentLoaded', function() {
    // Ініціалізація додатку
    initApp();
});

let cachedDayTotals = new Array(7).fill(0);
let cachedDayLimits = new Array(7).fill(0);

function initApp() {
    // Встановлюємо поточний тиждень
    setCurrentWeek();
    
    // Додаємо обробники подій
    setupEventListeners();
    
    // Завантажуємо збережені дані
    loadSavedData();
    
    // Оновлюємо дати тижня
    updateWeekDates();
    
    // Розраховуємо години
    calculateAllHours();
}

// Збереження даних
function saveData() {
    const data = {
        employees: getEmployeesData(),
        week: document.getElementById('week').value,
        limits: getLimitsData()
    };
    localStorage.setItem('workScheduleData', JSON.stringify(data));
}

function loadSavedData() {
    const savedData = localStorage.getItem('workScheduleData');
    if (savedData) {
        const data = JSON.parse(savedData);

        // Відновлюємо вибраний тиждень
        document.getElementById('week').value = data.week;
        
        // Відновлюємо ліміти
        if (data.limits) {
            setLimitsData(data.limits);
        }
        
        // Відновлюємо працівників
        if (data.employees && data.employees.length > 0) {
            clearAllEmployees();
            data.employees.forEach(emp => {
                addEmployee(emp.name, emp.schedule, false, emp.position || '');
            });
        }
    } else {
        // Якщо немає збережених даних - додаємо приклад працівників
        addExampleEmployees();
    }
}

function getEmployeesData() {
    const employees = [];
    document.querySelectorAll('.employee-row').forEach(row => {
        const name = row.querySelector('.employee-name').textContent;
        const position = row.querySelector('.employee-position') ? row.querySelector('.employee-position').textContent : '';
        const schedule = [];
        row.querySelectorAll('.day-cell').forEach(cell => {
            const primaryInput = cell.querySelector('.time-input[data-shift-type="primary"]');
            const secondaryInput = cell.querySelector('.time-input[data-shift-type="secondary"]');
            schedule.push({
                primary: primaryInput ? primaryInput.value : '',
                secondary: secondaryInput ? secondaryInput.value : '',
                locked: cell.classList.contains('is-locked')
            });
        });
        employees.push({ name, position, schedule });
    });
    return employees;
}

function getLimitsData() {
    const limits = [];
    document.querySelectorAll('.day-limit-input').forEach(input => {
        limits.push(input.value);
    });
    return limits;
}

function setLimitsData(limits) {
    document.querySelectorAll('.day-limit-input').forEach((input, index) => {
        input.value = limits[index] || input.value;
    });
    updateWeeklyLimitTotal();
}

function clearAllEmployees() {
    document.getElementById('employees-container').innerHTML = '';
}

function setCurrentWeek() {
    const weekInput = document.getElementById('week');
    const savedWeek = localStorage.getItem('workScheduleWeek');
    if (savedWeek) {
        weekInput.value = savedWeek;
    } else {
        const today = new Date();
        const year = today.getFullYear();
        const weekNum = getWeekNumber(today)[1];
        const weekString = `${year}-W${weekNum.toString().padStart(2, '0')}`;
        weekInput.value = weekString;
    }
}

function setupEventListeners() {
    // Кнопки управління
    document.getElementById('add-employee-btn').addEventListener('click', addNewEmployee);
    document.getElementById('clear-schedule').addEventListener('click', clearSchedule);
    document.getElementById('export-pdf').addEventListener('click', exportToPDF);
    document.getElementById('export-jpg').addEventListener('click', exportToJPG);
    
    // Вибір тижня
    document.getElementById('week').addEventListener('change', function() {
        updateWeekDates();
        saveData();
    });
    
    // Ліміти годин
    document.querySelectorAll('.day-limit-input').forEach(input => {
        input.addEventListener('change', function() {
            calculateUsedHours();
            updateWeeklyLimitTotal();
            saveData();
        });
    });

    initStatsTabs();
}

function addExampleEmployees() {
    
    saveData();
}

// Функції для роботи з тижнями
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return [d.getUTCFullYear(), weekNo];
}

function updateWeekDates() {
    const weekInput = document.getElementById('week');
    const [year, week] = weekInput.value.split('-W');
    
    const date = new Date(year, 0, 1);
    const dayNum = date.getDay();
    const dayDiff = (dayNum <= 4) ? 1 - dayNum : 8 - dayNum;
    date.setDate(date.getDate() + dayDiff + (week - 1) * 7);
    
    const dayCells = document.querySelectorAll('.table-header .day-cell');
    const months = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
    const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота', 'Неділя'];
    
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(date);
        currentDate.setDate(date.getDate() + i);
        const day = currentDate.getDate();
        const month = months[currentDate.getMonth()];
        if (!dayCells[i]) continue;
        dayCells[i].innerHTML = `<div class="day-name">${dayNames[i]}</div><div class="day-date">${day} ${month}</div>`;
        dayCells[i].dataset.dayName = dayNames[i];
        dayCells[i].dataset.dateLabel = `${day} ${month}`;
        dayCells[i].dataset.fullLabel = `${dayNames[i]} ${day} ${month}`;
    }
}

// Функції для роботи з працівниками
function addNewEmployee() {
    const name = prompt('Введіть ім\'я працівника:');
    if (!name) return;
    const position = prompt('Введіть посаду працівника:') || '';
    const emptySchedule = Array.from({ length: 7 }, () => ({ primary: '', secondary: '', locked: false }));
    addEmployee(name, emptySchedule, true, position);
}

function addEmployee(name, schedule, shouldSave = true, position = '') {
    const container = document.getElementById('employees-container');
    const employeeRow = document.createElement('div');
    employeeRow.className = 'employee-row';
    
    // Створення комірки з ім'ям
    const labelCell = createNameCell(name, position);
    employeeRow.appendChild(labelCell);
    
    // Створення комірок з графіком
    const normalizedSchedule = Array.from({ length: 7 }, (_, index) => normalizeScheduleValue(schedule ? schedule[index] : undefined));
    for (let i = 0; i < 7; i++) {
        const dayCell = createDayCell(normalizedSchedule[i]);
        employeeRow.appendChild(dayCell);
    }
    
    // Додавання комірки з загальною кількістю годин
    const totalCell = createTotalCell();
    employeeRow.appendChild(totalCell);
    
    container.appendChild(employeeRow);
    calculateAllHours();
    
    if (shouldSave) {
        saveData();
    }
}

function createNameCell(name, position = '') {
    const labelCell = document.createElement('div');
    labelCell.className = 'label-cell';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'employee-name';
    nameSpan.textContent = name;
    nameSpan.title = name;

    let positionSpan = null;
    if (position && position.trim() !== '') {
        positionSpan = document.createElement('span');
        positionSpan.className = 'employee-position';
        positionSpan.textContent = position;
        positionSpan.title = position;
    }

    const infoWrapper = document.createElement('div');
    infoWrapper.className = 'employee-info';
    infoWrapper.appendChild(nameSpan);
    if (positionSpan) {
        infoWrapper.appendChild(positionSpan);
    }

    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'employee-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'edit-employee';
    editBtn.innerHTML = '<span aria-hidden="true">✎</span>';
    editBtn.title = 'Редагувати працівника';
    editBtn.addEventListener('click', function() {
        const row = this.closest('.employee-row');
        if (!row) return;

        const currentName = nameSpan.textContent;
        const currentPosition = positionSpan ? positionSpan.textContent : '';

        const newNameInput = prompt('Оновити ім\'я працівника:', currentName);
        if (newNameInput === null) return;
        const trimmedName = newNameInput.trim();
        if (trimmedName !== '') {
            nameSpan.textContent = trimmedName;
            nameSpan.title = trimmedName;
        }

        const newPositionInput = prompt('Оновити посаду працівника:', currentPosition);
        if (newPositionInput === null) {
            saveData();
            updateWeeklyStats();
            return;
        }

        const trimmedPosition = newPositionInput.trim();
        if (trimmedPosition === '') {
            if (positionSpan && positionSpan.parentElement) {
                positionSpan.remove();
                positionSpan = null;
            }
        } else {
            if (!positionSpan) {
                positionSpan = document.createElement('span');
                positionSpan.className = 'employee-position';
                infoWrapper.appendChild(positionSpan);
            }
            positionSpan.textContent = trimmedPosition;
            positionSpan.title = trimmedPosition;
        }

        updateWeeklyStats();
        saveData();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-employee';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', function() {
        this.closest('.employee-row').remove();
        calculateAllHours();
        saveData();
    });

    labelCell.appendChild(infoWrapper);
    actionsWrapper.appendChild(editBtn);
    actionsWrapper.appendChild(deleteBtn);
    labelCell.appendChild(actionsWrapper);

    return labelCell;
}

function normalizeScheduleValue(scheduleValue) {
    if (!scheduleValue) {
        return { primary: '', secondary: '', locked: false };
    }

    if (typeof scheduleValue === 'string') {
        return { primary: scheduleValue, secondary: '', locked: false };
    }

    return {
        primary: scheduleValue.primary || '',
        secondary: scheduleValue.secondary || '',
        locked: !!scheduleValue.locked
    };
}

function createShiftInput(type, value) {
    const wrapper = document.createElement('div');
    wrapper.className = `shift-input ${type}-shift`;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'time-input';
    input.dataset.shiftType = type;
    input.placeholder = type === 'primary' ? 'вихідний' : 'друга зміна';
    input.value = value || '';

    setupShiftInputBehavior(input, type);

    wrapper.appendChild(input);

    let deleteBtn = null;
    if (type === 'secondary') {
        deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-shift-btn';
        deleteBtn.textContent = '×';
        deleteBtn.title = 'Видалити другу зміну';
        deleteBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            if (input.value.trim() !== '') {
                input.value = '';
                input.dispatchEvent(new Event('change'));
            }
        });
        wrapper.appendChild(deleteBtn);
    }

    updateShiftInputPlaceholders(input);
    updateDeleteButtonVisibility(deleteBtn, input.value);

    input.addEventListener('input', function() {
        updateDeleteButtonVisibility(deleteBtn, input.value);
    });

    return { container: wrapper, input, deleteBtn };
}

function setupShiftInputBehavior(input, type) {
    const defaultPlaceholder = type === 'primary' ? 'вихідний' : 'друга зміна';
    const activePlaceholder = '8 - 21';

    if (input.value.trim() === '') {
        input.placeholder = defaultPlaceholder;
    }

    input.addEventListener('focus', function() {
        if (this.value === '') {
            this.placeholder = activePlaceholder;
        }
    });

    input.addEventListener('blur', function() {
        if (this.value === '') {
            this.placeholder = defaultPlaceholder;
        }
    });

    input.addEventListener('change', function() {
        if (validateTimeInput(this, { defaultPlaceholder })) {
            calculateAllHours();
            saveData();
        }
        if (this.value === '') {
            this.placeholder = defaultPlaceholder;
        }
    });
}

function updateShiftInputPlaceholders(input) {
    if (input.value.trim() === '') {
        input.placeholder = input.dataset.shiftType === 'primary' ? 'вихідний' : 'друга зміна';
    }
}

function updateDeleteButtonVisibility(button, value) {
    if (!button) return;
    button.style.display = value && value.trim() !== '' ? 'block' : 'none';
}

function createDayCell(scheduleValue) {
    const { primary, secondary, locked } = normalizeScheduleValue(scheduleValue);
    const dayCell = document.createElement('div');
    dayCell.className = 'day-cell';

    const primaryShift = createShiftInput('primary', primary);
    dayCell.appendChild(primaryShift.container);

    const secondaryContainer = document.createElement('div');
    secondaryContainer.className = 'secondary-shift-container';

    const secondaryShift = createShiftInput('secondary', secondary);
    secondaryContainer.appendChild(secondaryShift.container);
    dayCell.appendChild(secondaryContainer);

    const dayOffLabel = document.createElement('div');
    dayOffLabel.className = 'day-off-label';
    dayOffLabel.textContent = 'вихідний';
    dayCell.appendChild(dayOffLabel);

    if (!secondary) {
        collapseSecondaryShift(secondaryContainer);
    } else {
        expandSecondaryShift(secondaryContainer);
    }

    setupSecondaryShiftInteractions({
        dayCell,
        primaryInput: primaryShift.input,
        secondaryContainer,
        secondaryInput: secondaryShift.input
    });

    setupLockInteractions({
        dayCell,
        primaryInput: primaryShift.input,
        secondaryInput: secondaryShift.input,
        secondaryContainer,
        dayOffLabel
    });

    setDayLockState(dayCell, {
        primaryInput: primaryShift.input,
        secondaryInput: secondaryShift.input,
        secondaryContainer,
        dayOffLabel
    }, locked, { skipSave: true, skipRecalculate: true });

    return dayCell;
}

function setupSecondaryShiftInteractions({ dayCell, primaryInput, secondaryContainer, secondaryInput }) {
    dayCell.addEventListener('mouseenter', function() {
        if (dayCell.classList.contains('is-locked')) return;
        if (primaryInput.value.trim() !== '' && secondaryContainer.classList.contains('is-collapsed')) {
            secondaryContainer.classList.add('is-preview');
        }
    });

    dayCell.addEventListener('mouseleave', function() {
        if (dayCell.classList.contains('is-locked')) return;
        secondaryContainer.classList.remove('is-preview');
    });

    secondaryContainer.addEventListener('click', function(event) {
        if (dayCell.classList.contains('is-locked')) return;
        if (secondaryContainer.classList.contains('is-collapsed')) {
            event.stopPropagation();
            expandSecondaryShift(secondaryContainer);
            secondaryInput.focus();
        }
    });

    secondaryInput.addEventListener('blur', function() {
        if (dayCell.classList.contains('is-locked')) return;
        if (this.value.trim() === '') {
            collapseSecondaryShift(secondaryContainer);
        }
    });

    secondaryInput.addEventListener('change', function() {
        if (dayCell.classList.contains('is-locked')) return;
        if (this.value.trim() === '') {
            collapseSecondaryShift(secondaryContainer);
        } else {
            expandSecondaryShift(secondaryContainer);
        }
    });
}

function collapseSecondaryShift(container) {
    container.classList.add('is-collapsed');
    container.classList.remove('is-preview');
}

function expandSecondaryShift(container) {
    container.classList.remove('is-collapsed');
    container.classList.remove('is-preview');
}

function setupLockInteractions({ dayCell, primaryInput, secondaryInput, secondaryContainer, dayOffLabel }) {
    dayCell.addEventListener('contextmenu', function(event) {
        event.preventDefault();
        const shouldLock = !dayCell.classList.contains('is-locked');
        setDayLockState(dayCell, {
            primaryInput,
            secondaryInput,
            secondaryContainer,
            dayOffLabel
        }, shouldLock);
    });
}

function setDayLockState(dayCell, config, locked, options = {}) {
    dayCell.classList.toggle('is-locked', locked);
    dayCell.dataset.locked = locked ? 'true' : 'false';

    if (config.dayOffLabel) {
        config.dayOffLabel.style.display = locked ? 'block' : 'none';
    }

    if (config.primaryInput) {
        config.primaryInput.disabled = locked;
    }
    if (config.secondaryInput) {
        config.secondaryInput.disabled = locked;
    }

    if (locked) {
        if (config.primaryInput) {
            config.primaryInput.value = '';
            updateShiftInputPlaceholders(config.primaryInput);
        }
        if (config.secondaryInput) {
            config.secondaryInput.value = '';
            updateShiftInputPlaceholders(config.secondaryInput);
            const deleteBtn = config.secondaryInput.parentElement.querySelector('.delete-shift-btn');
            updateDeleteButtonVisibility(deleteBtn, config.secondaryInput.value);
        }
        if (config.secondaryContainer) {
            collapseSecondaryShift(config.secondaryContainer);
        }
    } else {
        if (config.primaryInput) {
            updateShiftInputPlaceholders(config.primaryInput);
        }
        if (config.secondaryInput) {
            updateShiftInputPlaceholders(config.secondaryInput);
            const deleteBtn = config.secondaryInput.parentElement.querySelector('.delete-shift-btn');
            updateDeleteButtonVisibility(deleteBtn, config.secondaryInput.value);
        }
    }

    if (config.secondaryContainer) {
        config.secondaryContainer.classList.remove('is-preview');
    }

    if (!options.skipRecalculate) {
        calculateAllHours();
    }

    if (!options.skipSave) {
        saveData();
    }
}

function getDailyHoursFromCell(cell) {
    if (cell.classList.contains('is-locked')) {
        return { rawTotal: 0, adjustedTotal: 0 };
    }

    const primaryInput = cell.querySelector('.time-input[data-shift-type="primary"]');
    const secondaryInput = cell.querySelector('.time-input[data-shift-type="secondary"]');
    const durations = [];

    [primaryInput, secondaryInput].forEach(input => {
        const duration = parseShiftDuration(input ? input.value : '');
        if (duration !== null) {
            durations.push(duration);
        }
    });

    const rawTotal = durations.reduce((sum, hours) => sum + hours, 0);
    const adjustedTotal = rawTotal >= 5.75 ? Math.max(rawTotal - 1, 0) : rawTotal;

    return { rawTotal, adjustedTotal };
}

function parseShiftDuration(value) {
    if (!value) return null;
    const trimmed = value.trim();
    if (trimmed === '') return null;

    const parts = trimmed.split('-');
    if (parts.length !== 2) return null;

    const startTime = parseTimeString(parts[0]);
    const endTime = parseTimeString(parts[1]);

    if (!startTime || !endTime) {
        return null;
    }

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    let minutes = endMinutes - startMinutes;
    if (minutes <= 0) minutes += 24 * 60;

    return minutes / 60;
}

function parseTimeString(value) {
    const trimmed = value.trim();
    if (trimmed === '') return null;

    const pattern = /^(\d{1,2})(?::(\d{2}))?$/;
    const match = trimmed.match(pattern);
    if (!match) return null;

    const hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;

    if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23) {
        return null;
    }

    if (minute !== 0 && minute !== 30) {
        return null;
    }

    return { hour, minute };
}

function formatTimeDisplay(time) {
    if (time.minute === 0) {
        return `${time.hour}`;
    }
    return `${time.hour}:${time.minute.toString().padStart(2, '0')}`;
}

function timeToMinutes(time) {
    return time.hour * 60 + time.minute;
}

function formatHoursValue(value) {
    if (!value || Number.isNaN(value)) {
        return '0';
    }

    const rounded = Math.round(value * 4) / 4; // до 15 хвилин, на випадок комбінованих змін
    const fixed = rounded.toFixed(2);

    if (fixed.endsWith('.00')) {
        return fixed.slice(0, -3);
    }

    if (fixed.endsWith('0')) {
        return fixed.slice(0, -1);
    }

    return fixed;
}

function createTotalCell() {
    const totalCell = document.createElement('div');
    totalCell.className = 'total-cell';
    totalCell.textContent = '0';
    return totalCell;
}

function clearSchedule() {
    if (confirm('Ви впевнені, що хочете очистити графік всіх працівників?')) {
        document.querySelectorAll('.employee-row .day-cell').forEach(cell => {
            const primaryInput = cell.querySelector('.time-input[data-shift-type="primary"]');
            const secondaryInput = cell.querySelector('.time-input[data-shift-type="secondary"]');
            const secondaryContainer = cell.querySelector('.secondary-shift-container');
            const dayOffLabel = cell.querySelector('.day-off-label');

            setDayLockState(cell, {
                primaryInput,
                secondaryInput,
                secondaryContainer,
                dayOffLabel
            }, false, { skipSave: true, skipRecalculate: true });

            if (primaryInput) {
                primaryInput.value = '';
                primaryInput.disabled = false;
                updateShiftInputPlaceholders(primaryInput);
            }

            if (secondaryInput) {
                secondaryInput.value = '';
                secondaryInput.disabled = false;
                updateShiftInputPlaceholders(secondaryInput);
            }

            if (secondaryContainer) {
                collapseSecondaryShift(secondaryContainer);
            }
        });

        calculateAllHours();
        saveData();
    }
}

// Валідація та розрахунки
function validateTimeInput(input, options = {}) {
    const defaultPlaceholder = options.defaultPlaceholder || 'вихідний';
    const value = input.value.trim();
    if (value === '') return true;

    const parts = value.split('-');
    if (parts.length !== 2) {
        alert('Невірний формат часу. Використовуйте "8 - 21" або "8:30 - 14:30"');
        input.value = '';
        input.placeholder = defaultPlaceholder;
        return false;
    }

    const startTime = parseTimeString(parts[0]);
    const endTime = parseTimeString(parts[1]);

    if (!startTime || !endTime) {
        alert('Невірний формат часу. Використовуйте тільки години та хвилини :00 або :30 у діапазоні 0-23.');
        input.value = '';
        input.placeholder = defaultPlaceholder;
        return false;
    }

    if (timeToMinutes(startTime) === timeToMinutes(endTime)) {
        alert('Початковий та кінцевий час не можуть співпадати.');
        input.value = '';
        input.placeholder = defaultPlaceholder;
        return false;
    }

    input.value = `${formatTimeDisplay(startTime)} - ${formatTimeDisplay(endTime)}`;
    return true;
}

function calculateAllHours() {
    calculateEmployeeHours();
    calculateUsedHours();
    updateWeeklyLimitTotal();
}

function calculateEmployeeHours() {
    document.querySelectorAll('.employee-row').forEach(row => {
        let weeklyTotal = 0;
        let workingDays = 0;

        row.querySelectorAll('.day-cell').forEach(cell => {
            const { adjustedTotal } = getDailyHoursFromCell(cell);
            weeklyTotal += adjustedTotal;
            if (!cell.classList.contains('is-locked') && adjustedTotal > 0) {
                workingDays += 1;
            }
        });

        const offDays = Math.max(0, 7 - workingDays);

        row.dataset.totalHours = weeklyTotal;
        row.dataset.workingDays = workingDays;
        row.dataset.offDays = offDays;
        row.querySelector('.total-cell').textContent = formatHoursValue(weeklyTotal);
    });
}

function calculateUsedHours() {
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    const dayLimitInputs = document.querySelectorAll('.day-limit-input');
    const dayLimits = Array.from(dayLimitInputs).map(input => parseInt(input.value) || 0);
    const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота', 'Неділя'];
    const dateCells = document.querySelectorAll('.table-header .day-cell');
    
    // Розраховуємо суму годин по дням
    document.querySelectorAll('.employee-row').forEach(row => {
        row.querySelectorAll('.day-cell').forEach((cell, index) => {
            const { adjustedTotal } = getDailyHoursFromCell(cell);
            dayTotals[index] += adjustedTotal;
        });
    });

    cachedDayTotals = dayTotals.slice();
    cachedDayLimits = dayLimits.slice();

    // Оновлюємо рядок з використаними годинами
    updateUsedHoursRow(dayTotals, dayLimits, dayNames, dateCells);

    updateWeeklyStats();
}

function updateWeeklyLimitTotal() {
    const totalCell = document.getElementById('week-limit-total');
    if (!totalCell) return;
    const sum = Array.from(document.querySelectorAll('.day-limit-input')).reduce((acc, input) => {
        const val = parseFloat(input.value);
        return acc + (Number.isNaN(val) ? 0 : val);
    }, 0);
    totalCell.textContent = formatHoursValue(sum);
}

function updateUsedHoursRow(dayTotals, dayLimits, dayNames, dateCells) {
    const usedHoursRow = document.querySelector('.used-hours-row');
    const dayCells = usedHoursRow.querySelectorAll('.day-cell');
    let weekTotal = 0;
    let notificationMessages = [];
    
    dayTotals.forEach((total, index) => {
        dayCells[index].textContent = formatHoursValue(total);
        weekTotal += total;

        // Перевіряємо перевищення ліміту
        if (total > dayLimits[index]) {
            const headerCell = dateCells[index];
            const headerDayName = headerCell ? (headerCell.dataset.dayName || dayNames[index]) : dayNames[index];
            const headerDateLabel = headerCell ? (headerCell.dataset.dateLabel || headerCell.textContent) : '';
            dayCells[index].classList.add('limit-exceeded');
            notificationMessages.push(
                `Переліміт на ${headerDayName} (${headerDateLabel}) на ${formatHoursValue(total - dayLimits[index])} год.`
            );
        } else {
            dayCells[index].classList.remove('limit-exceeded');
        }
    });

    usedHoursRow.querySelector('.total-cell').textContent = formatHoursValue(weekTotal);

    // Показуємо сповіщення про перевищення лімітів
    if (notificationMessages.length > 0) {
        showNotification(notificationMessages.join('\n'));
    } else {
        hideNotification();
    }
}

function updateWeeklyStats() {
    const statsBody = document.getElementById('employee-stats-body');
    if (!statsBody) return;

    statsBody.innerHTML = '';

    const rows = Array.from(document.querySelectorAll('.employee-row'));
    let totalHoursAll = 0;
    let totalWorkingDaysAll = 0;

    rows.forEach(row => {
        const name = row.querySelector('.employee-name') ? row.querySelector('.employee-name').textContent : '';
        const position = row.querySelector('.employee-position') ? row.querySelector('.employee-position').textContent : '';
        const totalHours = parseFloat(row.dataset.totalHours || '0');
        const workingDays = parseInt(row.dataset.workingDays || '0', 10);
        const offDays = parseInt(row.dataset.offDays || (7 - workingDays), 10);
        const averageHours = workingDays > 0 ? totalHours / workingDays : 0;

        totalHoursAll += totalHours;
        totalWorkingDaysAll += workingDays;

        const rowEl = document.createElement('div');
        rowEl.className = 'employee-stats-row';

        const nameCell = document.createElement('span');
        nameCell.className = 'employee-name-cell';
        nameCell.textContent = name;

        const positionCell = document.createElement('span');
        positionCell.textContent = position || '—';

        const daysCell = document.createElement('span');
        daysCell.textContent = `${workingDays} / ${Math.max(0, offDays)}`;

        const hoursCell = document.createElement('span');
        hoursCell.textContent = formatHoursValue(totalHours);

        const averageCell = document.createElement('span');
        averageCell.textContent = formatHoursValue(averageHours);

        rowEl.appendChild(nameCell);
        rowEl.appendChild(positionCell);
        rowEl.appendChild(daysCell);
        rowEl.appendChild(hoursCell);
        rowEl.appendChild(averageCell);

        statsBody.appendChild(rowEl);
    });

    if (rows.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'employee-stats-empty';
        emptyState.textContent = 'Додайте працівників, щоб побачити статистику тижня';
        statsBody.appendChild(emptyState);
    }

    const totalWeekHoursEl = document.getElementById('total-week-hours');
    if (totalWeekHoursEl) {
        totalWeekHoursEl.textContent = formatHoursValue(totalHoursAll);
    }

    const avgWeekHoursEl = document.getElementById('average-week-hours');
    if (avgWeekHoursEl) {
        const averagePerEmployee = rows.length > 0 ? totalHoursAll / rows.length : 0;
        avgWeekHoursEl.textContent = formatHoursValue(averagePerEmployee);
    }

    const limitUsagePercentEl = document.getElementById('limit-usage-percent');
    const limitUsageBar = document.getElementById('limit-usage-bar');
    const totalLimit = cachedDayLimits.reduce((sum, value) => sum + value, 0);
    const totalUsed = cachedDayTotals.reduce((sum, value) => sum + value, 0);
    const percentValue = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
    const percentDisplay = percentValue % 1 === 0 ? percentValue.toFixed(0) : percentValue.toFixed(1);

    if (limitUsagePercentEl) {
        limitUsagePercentEl.textContent = `${percentDisplay}%`;
    }

    if (limitUsageBar) {
        const clamped = Math.max(0, Math.min(100, percentValue));
        limitUsageBar.style.width = `${clamped}%`;
    }
}

function initStatsTabs() {
    const tabs = document.querySelectorAll('.stats-tab');
    const panels = document.querySelectorAll('.stats-panel');
    if (tabs.length === 0) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.stats;

            tabs.forEach(btn => btn.classList.toggle('active', btn === tab));
            panels.forEach(panel => {
                panel.classList.toggle('active', panel.dataset.stats === target);
            });
        });
    });
}

// Сповіщення
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    setTimeout(hideNotification, 5000);
}

function hideNotification() {
    const notification = document.getElementById('notification');
    notification.style.display = 'none';
}

// Експорт
function exportToPDF() {
    const element = document.querySelector('.container');
    const opt = {
        margin: 10,
        filename: 'work_schedule.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    toggleControlsVisibility(true);
    html2pdf().from(element).set(opt).save().then(() => {
        toggleControlsVisibility(false);
    });
}

function exportToJPG() {
    const element = document.querySelector('.container');
    
    toggleControlsVisibility(true);
    html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true
    }).then(canvas => {
        toggleControlsVisibility(false);
        downloadImage(canvas);
    });
}

function toggleControlsVisibility(hide) {
    const controls = document.querySelector('.controls');
    controls.style.display = hide ? 'none' : 'flex';
}

function downloadImage(canvas) {
    const link = document.createElement('a');
    link.download = 'work_schedule.jpg';
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    link.click();
}

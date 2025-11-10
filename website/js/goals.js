document.addEventListener('DOMContentLoaded', init);

let nameInput, weightInput, sexInput, freqInput, dayInputs;

function init() {
    nameInput = document.querySelector('#name');
    weightInput = document.querySelector('#weight');
    sexInput = document.querySelector('#sex');
    freqInput = document.querySelector('#freq');
    dayInputs = Array.from(document.querySelectorAll('input[name="days"]'));

    const formElems = Array.from(document.querySelectorAll('#goalsForm input, #goalsForm select'));
    formElems.forEach(e => e.addEventListener('input', handleChange));

    freqInput.addEventListener('change', enforceDayLimit);
    dayInputs.forEach(cb => cb.addEventListener('change', enforceDayLimit));

    document.querySelector('#goalsForm').addEventListener('submit', () => {
        localStorage.removeItem('form');
    });

    loadForm();
    enforceDayLimit();
}

function enforceDayLimit() {
    const freqVal = freqInput.value;
    let maxDays = 7;

    if (freqVal === '12') maxDays = 2;
    else if (freqVal === '35') maxDays = 5;
    else if (freqVal === '67') maxDays = 7;

    const selected = dayInputs.filter(d => d.checked);
    if (selected.length > maxDays) {
        while (selected.length > maxDays) {
            const last = selected.pop();
            last.checked = false;
        }
    }

    handleChange();
}

function handleChange() {
    const form = {
        name: nameInput.value,
        weight: weightInput.value,
        sex: sexInput.value,
        freq: freqInput.value,
        days: dayInputs.filter(d => d.checked).map(d => d.value)
    };
    saveForm(form);
}

function saveForm(form) {
    localStorage.setItem('form', JSON.stringify(form));
}

function loadForm() {
    const cached = localStorage.getItem('form');
    if (!cached) return;

    const data = JSON.parse(cached);

    nameInput.value = data.name || '';
    weightInput.value = data.weight || '';
    sexInput.value = data.sex || '';
    freqInput.value = data.freq || '';

    if (data.days) {
        dayInputs.forEach(d => d.checked = data.days.includes(d.value));
    }
}

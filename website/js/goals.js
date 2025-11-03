
document.addEventListener('DOMContentLoaded', init, false);

let name, weight, sex, freq, days;

function init() {
    name = document.querySelector('#name');
    weight = document.querySelector('#weight');
    sex = document.querySelector('#sex');
    //
    freq = document.querySelector('#freq');
    days = document.querySelectorAll('input[name=days]');

    let elems = Array.from(document.querySelectorAll('#goalsForm input, #goalsForm select'));
	elems.forEach(e => e.addEventListener('input', handleChange, false));

    document.querySelector('#goalsForm').addEventListener('submit', () => {
        window.localStorage.removeItem('form');
    }, false);
}

function handleChange(e) {
	console.log('Handling change...');

	let form = {};
	form.name = name.value;
	form.weight = weight.value;
	form.sex = sex.value;
    //
	form.freq = freq.value;
	form.days = []; // either empty array or some things
	cookies.forEach(d => {
		if(d.checked) form.days.push(d.value);
	});
    
	saveForm(form);
}

function saveForm(form) {
	let f = JSON.stringify(form);
	window.localStorage.setItem('form', f);
}
function getForm() {
	let f = window.localStorage.getItem('form');
	if (f) return JSON.parse(f);
}

let cached = getForm();
if(cached) {
	name.value = cached.name;
	weight.value = cached.weight;
	sex.value = cached.inus;
	//
    freq.value = cached.comments;
	if(cached.days) {
		days.forEach(d => {
			if(cached.days.includes(d.value)) d.checked = true;
		});
	}
}


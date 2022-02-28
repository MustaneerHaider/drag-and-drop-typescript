'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
					? (desc = Object.getOwnPropertyDescriptor(target, key))
					: desc,
			d;
		if (
			typeof Reflect === 'object' &&
			typeof Reflect.decorate === 'function'
		)
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r =
						(c < 3
							? d(r)
							: c > 3
							? d(target, key, r)
							: d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var ProjectStatus;
(function (ProjectStatus) {
	ProjectStatus[(ProjectStatus['ACTIVE'] = 0)] = 'ACTIVE';
	ProjectStatus[(ProjectStatus['FINISHED'] = 1)] = 'FINISHED';
})(ProjectStatus || (ProjectStatus = {}));
class Project {
	constructor(id, title, description, people, status) {
		this.id = id;
		this.title = title;
		this.description = description;
		this.people = people;
		this.status = status;
	}
}
class State {
	constructor() {
		this.listeners = [];
	}
	addListener(listenerFn) {
		this.listeners.push(listenerFn);
	}
}
class ProjectState extends State {
	constructor() {
		super();
		this.projects = [];
	}
	addProject(title, description, numOfPeople) {
		const newProject = new Project(
			Math.random().toString(),
			title,
			description,
			numOfPeople,
			ProjectStatus.ACTIVE
		);
		this.projects.push(newProject);
		this.updateListeners();
	}
	moveProject(projectId, newStatus) {
		const project = this.projects.find(prj => prj.id === projectId);
		if (project && project.status !== newStatus) {
			project.status = newStatus;
			this.updateListeners();
		}
	}
	updateListeners() {
		for (const listenerFn of this.listeners) {
			listenerFn(this.projects.slice());
		}
	}
	static getInstance() {
		if (this.instance) {
			return this.instance;
		}
		this.instance = new ProjectState();
		return this.instance;
	}
}
const projectState = ProjectState.getInstance();
function validate(input) {
	let isValid = true;
	if (input.required) {
		isValid = isValid && input.value.toString().trim().length !== 0;
	}
	if (input.minLength != null && typeof input.value === 'string') {
		isValid = isValid && input.value.length >= input.minLength;
	}
	if (input.maxLength != null && typeof input.value === 'string') {
		isValid = isValid && input.value.length <= input.maxLength;
	}
	if (input.min != null && typeof input.value === 'number') {
		isValid = isValid && input.value >= input.min;
	}
	if (input.max != null && typeof input.value === 'number') {
		isValid = isValid && input.value <= input.max;
	}
	return isValid;
}
function autobind(_, _2, descriptor) {
	const originalMethod = descriptor.value;
	const adjDescriptor = {
		configurable: true,
		enumerable: false,
		get() {
			const boundFn = originalMethod.bind(this);
			return boundFn;
		}
	};
	return adjDescriptor;
}
class Component {
	constructor(templateId, hostElId, inserAtStart, newElementId) {
		this.templateEl = document.getElementById(templateId);
		this.hostEl = document.getElementById(hostElId);
		const importedNode = document.importNode(this.templateEl.content, true);
		this.element = importedNode.firstElementChild;
		if (newElementId) {
			this.element.id = newElementId;
		}
		this.attach(inserAtStart);
	}
	attach(insertAtStart) {
		this.hostEl.insertAdjacentElement(
			insertAtStart ? 'afterbegin' : 'beforeend',
			this.element
		);
	}
}
class ProjectItem extends Component {
	constructor(hostId, project) {
		super('single-project', hostId, false, project.id);
		this.project = project;
		this.configure();
		this.renderContent();
	}
	get persons() {
		if (this.project.people === 1) {
			return '1 person';
		} else {
			return `${this.project.people} persons`;
		}
	}
	dragStartHandler(event) {
		event.dataTransfer.setData('text/plain', this.project.id);
		event.dataTransfer.effectAllowed = 'move';
	}
	dragEndHandler(_) {}
	configure() {
		this.element.addEventListener('dragstart', this.dragStartHandler);
		this.element.addEventListener('dragend', this.dragEndHandler);
	}
	renderContent() {
		this.element.querySelector('h2').textContent = this.project.title;
		this.element.querySelector('h3').textContent =
			this.persons + ' assigned';
		this.element.querySelector('p').textContent = this.project.description;
	}
}
__decorate([autobind], ProjectItem.prototype, 'dragStartHandler', null);
class ProjectList extends Component {
	constructor(type) {
		super('project-list', 'app', false, `${type}-projects`);
		this.type = type;
		this.assignedProjects = [];
		this.configure();
		this.renderContent();
	}
	dragOverHandler(event) {
		if (
			event.dataTransfer &&
			event.dataTransfer.types[0] === 'text/plain'
		) {
			event.preventDefault();
			const listEl = this.element.querySelector('ul');
			listEl.classList.add('droppable');
		}
	}
	dropHandler(event) {
		const prjId = event.dataTransfer.getData('text/plain');
		projectState.moveProject(
			prjId,
			this.type === 'active'
				? ProjectStatus.ACTIVE
				: ProjectStatus.FINISHED
		);
	}
	dragLeaveHandler(_) {
		const listEl = this.element.querySelector('ul');
		listEl.classList.remove('droppable');
	}
	configure() {
		this.element.addEventListener('dragover', this.dragOverHandler);
		this.element.addEventListener('drop', this.dropHandler);
		this.element.addEventListener('dragleave', this.dragLeaveHandler);
		projectState.addListener(projects => {
			const relevantProjects = projects.filter(prj => {
				if (this.type === 'active') {
					return prj.status === ProjectStatus.ACTIVE;
				}
				return prj.status === ProjectStatus.FINISHED;
			});
			this.assignedProjects = relevantProjects;
			this.renderProjects();
		});
	}
	renderContent() {
		this.element.querySelector('ul').id = `${this.type}-projects-list`;
		this.element.querySelector(
			'h2'
		).textContent = `${this.type.toUpperCase()} PROJECTS`;
	}
	renderProjects() {
		const listEl = document.getElementById(`${this.type}-projects-list`);
		listEl.innerHTML = '';
		for (const prjItem of this.assignedProjects) {
			new ProjectItem(listEl.id, prjItem);
		}
	}
}
__decorate([autobind], ProjectList.prototype, 'dragOverHandler', null);
__decorate([autobind], ProjectList.prototype, 'dropHandler', null);
__decorate([autobind], ProjectList.prototype, 'dragLeaveHandler', null);
class ProjectInput extends Component {
	constructor() {
		super('project-input', 'app', true, 'user-input');
		this.titleInputEl = this.element.querySelector('#title');
		this.descriptionInputEl = this.element.querySelector('#description');
		this.peopleInputEl = this.element.querySelector('#people');
		this.configure();
	}
	configure() {
		this.element.addEventListener('submit', this.submitHandler);
	}
	renderContent() {}
	gatherUserInput() {
		const enteredTitle = this.titleInputEl.value;
		const enteredDescription = this.descriptionInputEl.value;
		const enteredPeople = +this.peopleInputEl.value;
		if (
			!validate({ value: enteredTitle, required: true, minLength: 3 }) ||
			!validate({
				value: enteredDescription,
				required: true,
				minLength: 5
			}) ||
			!validate({ value: enteredPeople, required: true, min: 1, max: 6 })
		) {
			return alert('Invalid input, please try again!');
		} else {
			return [enteredTitle, enteredDescription, +enteredPeople];
		}
	}
	clearInputs() {
		this.titleInputEl.value = '';
		this.descriptionInputEl.value = '';
		this.peopleInputEl.value = '';
	}
	submitHandler(event) {
		event.preventDefault();
		const userInput = this.gatherUserInput();
		if (Array.isArray(userInput)) {
			const [title, description, people] = userInput;
			projectState.addProject(title, description, people);
			this.clearInputs();
		}
	}
}
__decorate([autobind], ProjectInput.prototype, 'submitHandler', null);
const prjInput = new ProjectInput();
const activePrjList = new ProjectList('active');
const finishedPrjList = new ProjectList('finished');
//# sourceMappingURL=app.js.map

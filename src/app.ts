// Drag & Drop interfaces
interface Draggable {
	dragStartHandler(event: DragEvent): void;
	dragEndHandler(event: DragEvent): void;
}

interface DragTarget {
	dragOverHandler(event: DragEvent): void;
	dropHandler(event: DragEvent): void;
	dragLeaveHandler(event: DragEvent): void;
}

// Project Type
enum ProjectStatus {
	ACTIVE,
	FINISHED
}

class Project {
	constructor(
		public id: string,
		public title: string,
		public description: string,
		public people: number,
		public status: ProjectStatus
	) {}
}

// Listener Type
type Listener<T> = (items: T[]) => void;

class State<T> {
	protected listeners: Listener<T>[] = [];

	addListener(listenerFn: Listener<T>) {
		this.listeners.push(listenerFn);
	}
}

// Project State Management
class ProjectState extends State<Project> {
	private projects: Project[] = [];
	private static instance: ProjectState;

	private constructor() {
		super();
	}

	addProject(title: string, description: string, numOfPeople: number) {
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

	moveProject(projectId: string, newStatus: ProjectStatus) {
		const project = this.projects.find(prj => prj.id === projectId);
		if (project && project.status !== newStatus) {
			project.status = newStatus;
			this.updateListeners();
		}
	}

	private updateListeners() {
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

// validation
interface Validatable {
	value: string | number;
	required?: boolean;
	minLength?: number;
	maxLength?: number;
	min?: number;
	max?: number;
}

function validate(input: Validatable) {
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

// decorator for binding 'this'.
function autobind(_: any, _2: string, descriptor: PropertyDescriptor) {
	const originalMethod = descriptor.value;
	const adjDescriptor: PropertyDescriptor = {
		configurable: true,
		enumerable: false,
		get() {
			const boundFn = originalMethod.bind(this);
			return boundFn;
		}
	};
	return adjDescriptor;
}

// Component Base class
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
	templateEl: HTMLTemplateElement;
	hostEl: T;
	element: U;

	constructor(
		templateId: string,
		hostElId: string,
		inserAtStart: boolean,
		newElementId?: string
	) {
		this.templateEl = document.getElementById(
			templateId
		)! as HTMLTemplateElement;
		this.hostEl = document.getElementById(hostElId)! as T;

		const importedNode = document.importNode(this.templateEl.content, true);
		this.element = importedNode.firstElementChild as U;
		if (newElementId) {
			this.element.id = newElementId;
		}

		this.attach(inserAtStart);
	}

	private attach(insertAtStart: boolean) {
		this.hostEl.insertAdjacentElement(
			insertAtStart ? 'afterbegin' : 'beforeend',
			this.element
		);
	}

	abstract configure(): void;
	abstract renderContent(): void;
}

// ProjectItem class
class ProjectItem
	extends Component<HTMLUListElement, HTMLLIElement>
	implements Draggable
{
	private project: Project;

	get persons() {
		if (this.project.people === 1) {
			return '1 person';
		} else {
			return `${this.project.people} persons`;
		}
	}

	constructor(hostId: string, project: Project) {
		super('single-project', hostId, false, project.id);
		this.project = project;

		this.configure();
		this.renderContent();
	}

	@autobind
	dragStartHandler(event: DragEvent) {
		event.dataTransfer!.setData('text/plain', this.project.id);
		event.dataTransfer!.effectAllowed = 'move';
	}

	dragEndHandler(_: DragEvent) {}

	configure() {
		this.element.addEventListener('dragstart', this.dragStartHandler);
		this.element.addEventListener('dragend', this.dragEndHandler);
	}

	renderContent() {
		this.element.querySelector('h2')!.textContent = this.project.title;
		this.element.querySelector('h3')!.textContent =
			this.persons + ' assigned';
		this.element.querySelector('p')!.textContent = this.project.description;
	}
}

// ProjectList class
class ProjectList
	extends Component<HTMLDivElement, HTMLElement>
	implements DragTarget
{
	assignedProjects: Project[];

	constructor(private type: 'active' | 'finished') {
		super('project-list', 'app', false, `${type}-projects`);
		this.assignedProjects = [];

		this.configure();
		this.renderContent();
	}

	@autobind
	dragOverHandler(event: DragEvent) {
		if (
			event.dataTransfer &&
			event.dataTransfer.types[0] === 'text/plain'
		) {
			event.preventDefault();
			const listEl = this.element.querySelector('ul')!;
			listEl.classList.add('droppable');
		}
	}

	@autobind
	dropHandler(event: DragEvent) {
		const prjId = event.dataTransfer!.getData('text/plain');
		projectState.moveProject(
			prjId,
			this.type === 'active'
				? ProjectStatus.ACTIVE
				: ProjectStatus.FINISHED
		);
	}

	@autobind
	dragLeaveHandler(_: DragEvent) {
		const listEl = this.element.querySelector('ul')!;
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
		this.element.querySelector('ul')!.id = `${this.type}-projects-list`;
		this.element.querySelector(
			'h2'
		)!.textContent = `${this.type.toUpperCase()} PROJECTS`;
	}

	private renderProjects() {
		const listEl = document.getElementById(
			`${this.type}-projects-list`
		)! as HTMLUListElement;
		listEl.innerHTML = '';
		for (const prjItem of this.assignedProjects) {
			new ProjectItem(listEl.id, prjItem);
		}
	}
}

// ProjectInput class
class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
	titleInputEl: HTMLInputElement;
	descriptionInputEl: HTMLInputElement;
	peopleInputEl: HTMLInputElement;

	constructor() {
		super('project-input', 'app', true, 'user-input');

		// select input fields inside the form
		this.titleInputEl = this.element.querySelector(
			'#title'
		) as HTMLInputElement;
		this.descriptionInputEl = this.element.querySelector(
			'#description'
		) as HTMLInputElement;
		this.peopleInputEl = this.element.querySelector(
			'#people'
		) as HTMLInputElement;

		this.configure();
	}

	// attach a submit event listener to the form.
	configure() {
		this.element.addEventListener('submit', this.submitHandler);
	}

	renderContent() {}

	private gatherUserInput(): [string, string, number] | void {
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

	private clearInputs() {
		this.titleInputEl.value = '';
		this.descriptionInputEl.value = '';
		this.peopleInputEl.value = '';
	}

	// handle submission of the form
	@autobind
	private submitHandler(event: SubmitEvent) {
		event.preventDefault();

		const userInput = this.gatherUserInput();
		if (Array.isArray(userInput)) {
			const [title, description, people] = userInput;
			projectState.addProject(title, description, people);
			this.clearInputs();
		}
	}
}

// instantiate to render to the DOM.
const prjInput = new ProjectInput();
const activePrjList = new ProjectList('active');
const finishedPrjList = new ProjectList('finished');

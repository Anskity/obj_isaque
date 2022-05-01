import * as Database from "./database";
import * as Common from "./common";
import * as Discord from "discord.js";

export enum Medal {
	NONE = 0,
	JAM_WINNER = 1,
	BOT_DEV = 2,
	STEAM = 4,
	CURSO = 8, // terminou o curso
}

export interface User {
	id: string;
	money: number;
	description: string;
	messages: number;
	medals: Medal;
}

export interface Competitors {
	[key: string]: number;
};

export interface Event {
	msg: string;
	cost: number;
	users: Competitors;
	prize: number | string;
};

export interface EventResult {
	[key: string]: "SUCCESS" | "NOT REGISTERED" | "NO MONEY";
};

export interface EventWinner {
	user: string;
	points: number;
	prize: string | number;
};

export let event: Event | undefined;
let users: User[] = [];
let stagedUpdate: NodeJS.Timeout | undefined;

const emptyUser = (id: string): User => ({
	id,
	money: 100,
	messages: 0,
	description: "*eu não sei mudar a descrição com o `!!desc`*",
	medals: Medal.NONE
});

const medalTable: { [key: string]: number | undefined } = {
	"jam": Medal.JAM_WINNER,
	"dev": Medal.BOT_DEV,
	"steam": Medal.STEAM,
	"curso": Medal.CURSO
};

export const Medals: { emoji: string, name: string }[] = [
	{ emoji: '', name: "Nenhuma medalha" },
	{ emoji: '🏅', name: "Vencedor da Jam" },
	{ emoji: '🛠️', name: "Contribuidor do bot" },
	{ emoji: '<:steam:748226826085859339>', name: "Publicou jogo na Steam" },
	{ emoji: '<:capitao_none:582605020340682773>', name: "Terminou o Curso" }
];

const levels = ["748343273852108915", "748342968099930204", "748341527264362516"];
const levelMul = [4, 2, 1.5];

export const prayColldown = Common.TIME.hour * 22;

// NOTE(ljre): Events
export async function init() {
	await loadDB();

	return true;
}

export async function done() {
	if (stagedUpdate !== undefined) {
		clearTimeout(stagedUpdate);
		await updateDB();
	}
}

export function message(msg: Discord.Message) {
	if (msg.guild?.id !== Common.SERVER.id || Common.CHANNELS.shitpost.includes(<string>msg.channel?.id))
		return;

	const index = users.findIndex(u => u.id === msg.author.id);
	if (index === -1) {
		return;
	}

	if (++users[index].messages >= 100) {
		users[index].messages = 0;
		users[index].money += 50 * multiplierOf(msg.member?.roles);

		if (stagedUpdate === undefined)
			stagedUpdate = setTimeout(updateDB, Common.TIME.minute * 5);
	}
}

// NOTE(ljre): Functions
async function loadDB() {
	const objs = await Database.readCollection("balance");

	users = objs.users;
	event = objs.event;
	if (event?.cost === undefined)
		event = undefined;
}

export async function updateDB() {
	if (stagedUpdate !== undefined) {
		clearTimeout(stagedUpdate);
		stagedUpdate = undefined;
	}

	await Database.writeCollection("balance", "users", users);
}

// NOTE(ljre): API
/**
 * @note This function DOESN'T update the database when it's called.
 * @param userid User's id
 */
export function weakCreateUser(userid: string): Common.Result {
	const index = users.findIndex(u => u.id === userid);
	if (index !== -1)
		return { ok: false, error: "usuário/você já está registrado" };

	users.push(emptyUser(userid));

	return { ok: true, data: undefined };
}

/**
 * @note This function DOES update the database when it's called.
 * @param userid User's id
 */
export function createUser(userid: string): Common.Result {
	const result = weakCreateUser(userid);
	if (result.ok)
		updateDB();
	return result;
}

/**
 * @returns An copy of the user.
 * @param userid User's id
 */
export function userData(userid: string): Common.Result<User> {
	const index = users.findIndex(u => u.id === userid);
	if (index === -1)
		return { ok: false, error: "usuário/você não está registrado" };
	return { ok: true, data: { ...users[index] } };
}

/**
 * @returns Top 9 members of a page.
 * @param page The page number. This value should be >= 0.
 * @param qnt The size of a page.
 */
export function richest(page: number, qnt: number): User[] {
	return users.sort((u1, u2) => u2.money - u1.money).slice(page * qnt, (page + 1) * qnt);
}

export function giveMedal(userid: string, medal: string): Common.Result {
	const index = users.findIndex(u => u.id === userid);
	if (index === -1) {
		return { ok: false, error: "usuário/você não está registrado" };
	}

	const user = users[index];
	const m = medalTable[medal];

	if (!m) {
		return { ok: false, error: "medalha não existe" };
	}

	user.medals |= m;
	updateDB();

	return { ok: true, data: void 0 };
}

export function removeMedal(userid: string, medal: string): Common.Result {
	const index = users.findIndex(u => u.id === userid);
	if (index === -1) {
		return { ok: false, error: "usuário/você não está registrado" };
	}

	const user = users[index];
	const m = medalTable[medal];

	if (!m) {
		return { ok: false, error: "medalha não existe" };
	}

	user.medals &= ~m;
	updateDB();

	return { ok: true, data: void 0 };
}

export function medals(m: Medal) {
	let result = <{ emoji: string, name: string }[]>[];

	for (let i = 1; i < Medals.length; i++) {
		if ((m >> (i - 1)) & 1)
			result.push(Medals[i]);
	}

	if (result.length === 0)
		result[0] = Medals[0];

	return result;
}

// export function resetAll() {
// 	users = [];
// 	updateDB();
// }

export function changeDesc(userid: string, desc: string): Common.Result {
	const index = users.findIndex(u => u.id === userid);
	if (index === -1) {
		return { ok: false, error: "usuário/você não está registrado" };
	}

	users[index].description = desc;
	updateDB();
	return { ok: true, data: void 0 };
}

export function prize(usersids: string[], qnt: number, mult = true): Common.Result<number>[] {
	let success = <Common.Result<number>[]>[];

	for (let i = 0; i < usersids.length; i++) {
		const userid = usersids[i];
		const index = users.findIndex(u => u.id === userid);
		if (index === -1) {
			success[i] = { ok: false, error: "usuário não está registrado" };
			continue;
		}

		success[i] = { ok: true, data: (users[index].money += qnt * (mult ? multiplierOf(userid) : 1)) };
	}

	updateDB();
	return success;
}

export function buy(userid: string, qnt: number, zero = false): Common.Result<boolean> {
	const index = users.findIndex(u => u.id === userid);
	if (index === -1) {
		return { ok: false, error: "usuário/você não está registrado" };
	}

	const user = users[index];
	if (user.money < qnt) {
		if (zero) user.money = 0;
		return { ok: true, data: false };
	}

	user.money -= qnt;
	return { ok: true, data: true };
}

export function multiplierOf(roles?: Discord.GuildMemberRoleManager | string): number {
	if (typeof roles === "string") {
		roles = Common.client.guilds.cache.get(Common.SERVER.id)?.members.cache.get(roles)?.roles;
	}

	if (!roles)
		return 1;

	for (let i = 0; i < levels.length; i++) {
		if (roles.cache.has(levels[i]))
			return levelMul[i];
	}

	return 1;
}

export function transfer(id1: string, id2: string, qnt: number): Common.Result<undefined> {
	const index1 = users.findIndex(u => u.id === id1);
	const index2 = users.findIndex(u => u.id === id2);

	if (index1 === -1 || index2 === -1) {
		return { ok: false, error: "usuário/você não está registrado" };
	}

	if (users[index1].money < qnt) {
		return { ok: false, error: "usuário/você não tem dinheiro o suficiente para a transferência" };
	}

	users[index1].money -= qnt;
	users[index2].money += qnt;
	updateDB();

	return { ok: true, data: void 0 };
}

export function userCount() {
	return users.length;
}

export function beginEvent(msg: string, cost: number, prize: number | string, users: string[]): Common.Result<EventResult> {
	if (event) {
		return { ok: false, error: "Não posso rodar mais de um evento ao mesmo tempo" };
	}

	const ev = <Event>{ msg, cost, users: {}, prize };
	const result = <EventResult>{};

	for (const user of users) {
		const r = buy(user, cost);

		if (!r.ok) {
			result[user] = "NOT REGISTERED";
			continue;
		}

		if (!r.data) {
			result[user] = "NO MONEY";
			continue;
		}

		result[user] = "SUCCESS";
		ev.users[user] = 0;
	}

	event = ev;
	Database.writeCollection("balance", "event", event);
	updateDB();

	return { ok: true, data: result };
}

export function eventPoint(user: string, qnt = 1): Common.Result<number> {
	if (!event) {
		return { ok: false, error: "Não existe um evento acontecendo no momento" };
	}

	const points = event.users[user];
	if (points === void 0) {
		return { ok: false, error: "Esse usuário não está participando" };
	}

	event.users[user] += qnt;
	Database.writeCollection("balance", "event", event);

	return { ok: true, data: event.users[user] };
}

export function finishEvent(): Common.Result<EventWinner, string[]> {
	if (!event) {
		return { ok: false, error: "Não existe um evento acontecendo no momento" };
	}

	const keys = Object.keys(event.users);
	if (keys.length === 0) {
		return { ok: false, error: "Não tem nenhum participante nesse evento" };
	}

	let winners = <EventWinner[]>[];

	for (const key of keys) {
		winners.push({ user: key, points: event.users[key], prize: event.prize });
	}

	winners = winners.sort((a, b) => b.points - a.points);
	winners = winners.filter(w => w.points >= winners[0].points);

	if (winners.length > 1) {
		return { ok: false, error: "Empate!", extra: winners.reduce((acc, val) => (acc.push(val.user), acc), <string[]>[]) };
	}

	if (typeof event.prize === "number")
		prize([winners[0].user], event.prize, true);

	event = undefined;

	Database.writeCollection("balance", "event", event);

	return { ok: true, data: winners[0] };
}

const discordServer = require("./../constants/index");
const { isAdmin } = require("./Moderation");
const userData = "./data/usersdata.json";
const fs = require("fs");
const moneyToWon = 100;
const messagesPerMoney = 100;
let loteriaCurrent = -1;
let sorteioCurrent = -1;
let corridaCurrent = false;

const Banco = {
    json: {},
    jsonOpened: false,
    jsonOpen() {
        const raw = fs.readFileSync(userData);
        this.json = JSON.parse(raw);
        this.jsonOpened = true;
    },
    jsonClose() {
        const text = JSON.stringify(this.json);
        fs.writeFileSync(userData, text);
        this.json = {};
        this.jsonOpened = false;
    },
    isRegistered(userid) {
        this.jsonOpen();
        const result = this.json.users.some(a => a.userid === userid);
        this.jsonClose();
        return result;
    },
    register(userid) {
        this.jsonOpen();
        if (this.json.users.some(a => a.userid === userid)) {
            this.jsonClose();
            return false;
        }
        this.json.users.push({ userid: userid, money: 100, messages: 0, last: 0, mendigagem: 0 });
        this.jsonClose();
        return true;
    },
    weekMoney(userid) {
        this.jsonOpen();
        const user = this.json.users.findIndex(a => a.userid === userid);

        if (user === -1) {
            this.jsonClose();
            return -1;
        }

        if (this.json.users[user].last + discordServer.timing.week <= Date.now()) {
            this.json.users[user].money += moneyToWon;
            this.json.users[user].last = Date.now();
            this.jsonClose();
            return moneyToWon;
        } else {
            this.jsonClose();
            return 0;
        }
    },
    /**
     * @returns {number}
     * @param {string} userid Id do usuário
     */
    userMessage(userid) {
        this.jsonOpen();
        const user = this.json.users.findIndex(a => a.userid === userid);

        if (user === -1) {
            this.jsonClose();
            return -1;
        }

        this.json.users[user].messages++;
        if (this.json.users[user].messages >= messagesPerMoney) {
            this.json.users[user].messages -= messagesPerMoney;
            this.json.users[user].money += moneyToWon;
            this.jsonClose();
            return moneyToWon;
        } else {
            this.jsonClose();
            return 0;
        }
    },

    /**
     * @returns {boolean} Retorna false se o usuário for inválido ou se o usuário não estiver registrado. True se o dinheiro for descontado com sucesso.
     * @param {string} userid ID do usuário.
     * @param {number} qnt Quantidade de dinheiro para ser descontada.
     */
    userPunish(userid, qnt) {
        this.jsonOpen();
        const user = this.json.users.findIndex(a => a.userid === userid);

        if (user === -1) {
            this.jsonClose();
            return false;
        }

        this.json.users[user].money = Math.max(this.json.users[user].money - qnt, 0);
        this.jsonClose();
        return true;
    },

    /**
     * @returns {number} Dinheiro do usuário. -1 se o usuário não estiver registrado.
     * @param {string} userid ID do usuário
     */
    saldo(userid) {
        this.jsonOpen();
        const user = this.json.users.findIndex(a => a.userid === userid);

        if (user === -1) {
            this.jsonClose();
            return -1;
        }

        const qnt = this.json.users[user].money;
        this.jsonClose();
        return qnt;
    },

    /**
     * @returns {number} 1 se a transação for bem sucedida, 0 se houver uma falha na transação, -1 se o primeiro usuário não estiver registrado e -2 se o segundo usuário não estiver registrado.
     * @param {string} userid1 ID do usuário que irá enviar o dinheiro.
     * @param {string} userid2 ID do usuário que irá receber o dinheiro.
     * @param {number} qnt Quantidade de dinheiro que deverá ser enviado.
     */
    transfer(userid1, userid2, qnt) {
        this.jsonOpen();

        const u1 = this.json.users.findIndex(a => a.userid === userid1);
        if (u1 === null || u1 === undefined) {
            this.jsonClose();
            return -1;
        }
        const u2 = this.json.users.findIndex(a => a.userid === userid2);
        if (u2 === null || u2 === undefined) {
            this.jsonClose();
            return -2;
        }

        if (this.json.users[u1].money < qnt) {
            this.jsonClose();
            return 0;
        }

        this.json.users[u1].money -= qnt;
        this.json.users[u2].money += qnt;

        this.jsonClose();
        return 1;
    },

    /**
     * @returns {number} -1 se o usuário não estiver registrado ou for inválido. Um inteiro maior que 0 se o usuário existir.
     * @param {string} userid ID do usuário
     */
    messages(userid) {
        this.jsonOpen();
        const user = this.json.users.findIndex(a => a.userid === userid);

        if (user === null) {
            this.jsonClose();
            return -1;
        }

        const msgs = this.json.users[user].messages;
        this.jsonClose();
        return msgs;
    },

    /**
     * 
     * @param {string} userid ID do usuário que receberá o dinheiro.
     * @param {number} qnt Quantidade de dinheiro que será dada ao usuário.
     */
    giveMoney(userid, qnt) {
        this.jsonOpen();
        const user = this.json.users.findIndex(a => a.userid === userid);

        if (user === -1) {
            this.jsonClose();
            return;
        }

        this.json.users[user].money += qnt;
        this.jsonClose();
    },

    /**
     * @returns {number} Retorna -1 se o usuário não está registrado, -2 se ele ainda não pode mendigar de novo, 0 se ele não ganhou nada e um número maior que 0 se o usuário ganhou algo.
     * @param {string} userid ID do usuário
     */
    mendigar(userid) {
        this.jsonOpen();
        const user = this.json.users.findIndex(a => a.userid === userid);

        if (user === -1) {
            this.jsonClose();
            return -1;
        }

        if (this.json.users[user].mendigagem + discordServer.timing.day > Date.now()) {
            this.jsonClose();
            return -2;
        }

        if (Math.random() < 0.5) {
            const m = Math.trunc((Math.random()) * 81 + 20);
            this.json.users[user].money += m;
            this.json.users[user].mendigagem = Date.now();
            this.jsonClose();
            return m;
        } else {
            this.jsonClose();
            return 0;
        }
    },

    /**
     * @returns {number} Retorna -1 se o usuário não estiver registrado e -2 caso o usuário não tenha dinheiro o suficiente. Caso contrário retornará 0.
     * @param {string} userid ID do usuário.
     * @param {number} cost Custo da corrida.
     */
    horseraceJoin(userid, cost) {
        this.jsonOpen();
        const user = this.json.users.findIndex(a => a.userid === userid);

        if (user === -1) {
            this.jsonClose();
            return -1;
        }

        if (this.json.users[user].money < cost) {
            this.jsonClose();
            return -2;
        }

        this.json.users[user].money -= cost;
        this.jsonClose();
        return 0;
    }
};

class Loteria {
    constructor(custo) {
        this.participantes = [];
        this.custo = custo;
    }

    /**
     * @returns {number} Retorna -1 se o usuário já tiver comprado algum bilhete, caso contrário retorna a quantidade de bilhetes compradas
     * @param {string} user 
     * @param {number} qnt
     */
    bilhete(user, qnt) {
        if (this.participantes.some(a => a === user)) return -1;
        Banco.jsonOpen();
        const userindex = Banco.json.users.findIndex(a => a.userid === user);
        let i;
        for (i = 0; i < qnt; i++) {
            if (Banco.json.users[userindex].money < this.custo) break;

            this.participantes.push(user);
            Banco.json.users[userindex].money -= this.custo;
        }
        Banco.jsonClose();
        return i;
    }

    /**
     * @returns {number} A quantidade de dinheiro já acumulada.
     */
    pot() {
        return this.participantes.length * this.custo;
    }

    /**
     * @returns {object} Retorna o ID do usuário vencedor e a quantidade de dinheiro obtida. {user: string, money: number}
     */
    resultado() {
        if (this.participantes.length === 0) return undefined;
        const result = Math.min(Math.floor(Math.random() * this.participantes.length), this.participantes.length - 1);
        const moneyWon = this.participantes.length * this.custo;
        Banco.jsonOpen();
        const ind = Banco.json.users.indexOf(Banco.json.users.find(a => a.userid === this.participantes[result]));
        Banco.json.users[ind].money += moneyWon;
        const toReturn = { user: this.participantes[result], money: moneyWon };
        Banco.jsonClose();
        return toReturn;
    }
}

class Sorteio {
    constructor(msg, qnt, time) {
        msg.react(discordServer.yesEmoji);
        this.participantes = [];
        this.qnt = qnt;
        const filter = (reaction, user) => reaction.emoji.name === discordServer.yesEmoji && Banco.isRegistered(user.id);
        this.collector = msg.createReactionCollector(filter, { time: time });;
        this.collector.on('end', collected => {
            collected.forEach(reaction => {
                reaction.users.forEach(user => { msg.client.user.id !== user.id ? this.participantes.push(user.id) : null });
            });

            const winner = Math.floor(this.participantes.length * Math.random());
            Banco.giveMoney(this.participantes[winner], this.qnt);
            msg.channel.send(`Parabéns, <@${this.participantes[winner]}>! Você ganhou \`$${this.qnt}\`!`);
            sorteioCurrent = -1;
        });
    }
}

function CorridaDeCavalo(msg, maxUsers, timeToRun, duration, cost) {
    corridaCurrent = true;
    const filter = (reaction, user) => reaction.emoji.name === discordServer.yesEmoji && user.id !== msg.client.user.id && Banco.isRegistered(user.id);
    const horseEmoji = '🏇';
    let users = [];
    msg.channel.send(`${msg.author} A corrida de cavalos iniciará em ${timeToRun} segundos!`)
        .then(message => {
            message.react(discordServer.yesEmoji)
                .then(() => {
                    const collector = message.createReactionCollector(filter, { time: timeToRun * 1000 });
                    collector.on("end", collection => {
                        collection.forEach(reaction => {
                            reaction.users.forEach(user => {
                                if (msg.client.user.id !== user.id && users.length < maxUsers) {
                                    const result = Banco.horseraceJoin(user.id, cost);
                                    if (result === -1) {
                                        msg.channel.send(`${user} Você não está registrado!`);
                                    } else if (result === -2) {
                                        msg.channel.send(`${user} Você não tem dinheiro o suficiente para participar desta corrida!`);
                                    } else {
                                        users.push(user.id);
                                    }
                                }
                            });
                        });

                        if (users.length < 2) {
                            msg.channel.send("Não é possível ter corrida com menos de 2 participantes!");
                            corridaCurrent = false;
                        } else {
                            gameRun(users, message);
                        }
                    });
                });
        });

    function gameRun(users, mymsg) {
        let horses = [];

        let _maxstr = String(users.length).length + 1;
        let newText = "Participantes escolhidos!\n```";
        for (let i = 0; i < users.length; i++) {
            horses.push({ progress: 0, owner: users[i] });
            const member = mymsg.guild.members.find(a => a.id === users[i]);
            newText += `${i + 1 + (' '.repeat(_maxstr - String(i).length))}- ${member.user.tag}\n`;
        }
        newText += "```";
        mymsg.edit(newText).then(msg => {
            msg.channel.send("...").then(message => tick(message, horses));
        });
    }

    function tick(message, horses) {
        let winner = -1;
        let newText = "Progresso da corrida:```";

        for (let i = 0; i < horses.length; i++) {
            if (Math.random() < 0.75) horses[i].progress++;

            newText += `${i + 1 + (i < 9 ? ' ' : '  ')}- |`;
            newText += ' '.repeat(duration - horses[i].progress);
            newText += `${horseEmoji}`;
            newText += `${' '.repeat(duration - (duration - horses[i].progress) - 1)}|\n`;

            if (horses[i].progress >= duration) {
                winner = i;
            }
        }

        let member;
        if (winner > 0) {
            member = message.guild.members.find(a => a.id === horses[winner].owner);
            newText = [...`Vencedor: ${member.user}\n`, ...newText].join('');
        } else {
            newText = [..."Vencedor: (Ainda em andamento...)\n", ...newText].join('');
        }

        newText += "```";

        message.edit(newText).then(msg => {
            if (winner === -1) setTimeout(tick, discordServer.timing.second, message, horses);
            else {
                let moneyWon = horses.length * cost;
                member = message.guild.members.find(a => a.id === horses[winner].owner);
                Banco.giveMoney(member, moneyWon);
                msg.channel.send(`Parabéns, ${member.user}! Você acaba de ganhar \`$${moneyWon}\`!`);
                corridaCurrent = false;
            }
        });
    }
}

// !!corrida maxParticipantes tempoParaComeçar duração aposta
function corrida(msg, args) {
    if (!isAdmin(msg.author)) return;
    if (args.length < 5) {
        msg.channel.send(`${msg.author} Sintaxe inválida!`);
        return;
    }

    if (corridaCurrent) {
        msg.channel.send(`${msg.author} Já existe uma corrida rolando!`);
        return;
    }

    const maxUsers = Number(args[1]);
    if (maxUsers === NaN) {
        msg.channel.send(`${msg.author} Quantidade máxima de participantes inválida!`);
        return;
    }

    const timeToRun = Number(args[2]);
    if (timeToRun === NaN || timeToRun < 10) {
        msg.channel.send(`${msg.author} Tempo para começar inválido!`);
        return;
    }

    const duration = Number(args[3]);
    if (duration === NaN || duration < 5) {
        msg.channel.send(`${msg.author} Duração inválida!`);
        return;
    }

    const cost = Number(args[4]);
    if (cost === NaN || cost < 10) {
        msg.channel.send(`${msg.author} Aposta inválida!`);
        return;
    }

    CorridaDeCavalo(msg, maxUsers, timeToRun, duration, cost);
}

function register(msg) {
    const result = Banco.register(msg.author.id);
    if (result) {
        msg.channel.send(`${msg.author} Você foi registrado com sucesso!`);
    } else {
        msg.channel.send(`${msg.author} Você já está registrado!`);
    }
}

function semanal(msg) {
    const result = Banco.weekMoney(msg.author.id);
    if (result < 0) {
        msg.channel.send(`${msg.author} Você não está registrado!`);
    } else if (result === 0) {
        msg.channel.send(`${msg.author} Você ainda não pode resgatar o prêmio semanal!`);
    } else {
        msg.channel.send(`${msg.author} Você resgatou \`$${result}\``);
    }
}

function onUserMessage(msg) {
    if (msg.channel.name === discordServer.shitpostChannel) return;
    const result = Banco.userMessage(msg.author.id);
    if (result > 0) {
        msg.guild.channels.find(a => a.name === discordServer.shitpostChannel).send(`${msg.author} Parabéns! Você ganhou \`$${result}\``);
    }
}

function punish(msg, args) {
    if (!isAdmin(msg.author)) return;
    if (args.length < 3) {
        msg.channel.send(`${msg.author} Informe o usuário que deseja punir e quanto deseja descontar dele.`);
        return;
    }

    const qnt = Number(args[1]);
    if (isNaN(qnt) || qnt !== Math.trunc(qnt)) {
        msg.channel.send(`${msg.author} Quantidade inválida.`);
        return;
    }

    msg.mentions.members.forEach(m => {
        if (isAdmin(m)) return;
        const result = Banco.userPunish(m.id, qnt);
        if (result) {
            msg.channel.send(`${msg.author} O usuário ${m.user.tag} foi punido com sucesso.`);
        } else {
            msg.channel.send(`${msg.author} Não foi possível punir o usuário ${m.user.tag}. Talvez ele não esteja registrado ainda!`);
        }
    });
}

function loteria(msg, args) {
    if (!isAdmin(msg.author)) return;
    if (loteriaCurrent !== -1) {
        msg.channel.send(`${msg.author} Já existe uma loteria rolando!`);
        return;
    }
    if (args.length < 2) {
        msg.channel.send(`${msg.author} Informe quanto custará cada bilhete da loteria!`);
        return;
    }

    const preco = Number(args[1]);
    if (isNaN(preco) || preco <= 0 || preco !== Math.trunc(preco)) {
        msg.channel.send(`${msg.author} Preço dos bilhetes inválido!`);
        return;
    }

    loteriaCurrent = new Loteria(Number(args[1]));
    msg.channel.send(`${msg.author} Loteria iniciada!`);
}

function bilhete(msg, args) {
    if (loteriaCurrent === -1) {
        msg.channel.send(`${msg.author} Não existe nenhuma loteria iniciada!`);
        return;
    }
    if (args.length < 2) {
        msg.channel.send(`${msg.author} Informe quantos bilhetes deseja comprar. Esta é uma compra única!`);
        return;
    }

    const qnt = Number(args[1]);
    if (isNaN(qnt) || qnt <= 0 || qnt !== Math.trunc(qnt)) {
        msg.channel.send(`${msg.author} Quantidade de bilhetes inválida.`);
        return;
    }
    const result = loteriaCurrent.bilhete(msg.author.id, qnt);
    if (result < 0) {
        msg.channel.send(`${msg.author} Você não está registrado ou já usou o \`${discordServer.prefix}bilhete\` antes!`);
    } else if (result === 0) {
        msg.channel.send(`${msg.author} Infelizmente você não pôde comprar nenhum bilhete. <:Zgatotristepo:589449862697975868>`);
    } else if (result < qnt) {
        msg.channel.send(`${msg.author} Infelizmente você não havia dinheiro suficiente para comprar esta quantidade de bilhetes. Então você acabou comprando somente ${result}.`);
    } else {
        msg.channel.send(`${msg.author} Você comprou ${qnt} bilhete(s). Boa sorte!`);
    }
}

function resultado(msg) {
    if (!isAdmin(msg.author)) return;
    if (loteriaCurrent === -1) {
        msg.channel.send(`${msg.author} Não existe nenhuma loteria iniciada!`);
        return;
    }

    const result = loteriaCurrent.resultado();
    if (result === undefined) {
        msg.channel.send(`${msg.author} Loteria encerrada com 0 participantes!`);
        return;
    }

    msg.channel.send(`Parabéns, <@${result.user}>! Você acaba de ganhar \`$${result.money}\`!`);
    msg.channel.send(`Obrigado a todos os outros membros que participaram dessa loteria! Boa sorte na próxima para os outros participantes.`);
    loteriaCurrent = -1;
}

function pot(msg) {
    if (loteriaCurrent === -1) {
        msg.channel.send(`${msg.author} Não existe nenhuma loteria iniciada!`);
        return;
    }

    const result = loteriaCurrent.pot();
    msg.channel.send(`${msg.author} A quantidade de dinheiro acumulada é ${result}`);
}

function saldo(msg, args) {
    if (args.length < 2) {
        const saldo = Banco.saldo(msg.author.id);
        if (saldo === -1) {
            msg.channel.send(`${msg.author} Você não está registrado!`);
            return;
        }
        msg.channel.send(`${msg.author} Seu saldo é \`$${saldo}\``);
    } else {
        const m = msg.mentions.members.first();
        const saldo = Banco.saldo(m.id);
        if (saldo === -1) {
            msg.channel.send(`${msg.author} Este usuário não está registrado!`);
            return;
        }
        msg.channel.send(`${msg.author} O saldo do(a) ${m.user.tag} é \`$${saldo}\``);
    }
}

function transfer(msg, args) {
    if (args.length < 3) {
        msg.channel.send(`${msg.author} Sintaxe inválida. Consulte o \`!!help\`.`);
        return;
    }
    if (args[2][0] !== '<') {
        msg.channel.send(`${msg.author} Usuário inválido.`);
        return;
    }

    const qnt = Number(args[1]);
    if (isNaN(qnt) || qnt <= 0 || qnt !== Math.trunc(qnt)) {
        msg.channel.send(`${msg.author} Valor inválido.`);
        return;
    }
    const member = msg.mentions.members.first();

    if (member.id === msg.author.id) {
        msg.channel.send(`${msg.author} Você tem algum problema por acaso?`);
        return;
    }

    const result = Banco.transfer(msg.author.id, member.id, qnt);

    switch (result) {
        case -2: msg.channel.send(`${msg.author} Usuário inválido.`); break;
        case -1: msg.channel.send(`${msg.author} Você não está registrado!`); break;
        case 0: msg.channel.send(`${msg.author} Você não tem dinheiro o suficiente!`); break;
        case 1: msg.channel.send(`${msg.author} Você transferiu \`${qnt}\` para ${member.user.tag}!`); break;
    }
}

function messages(msg, args) {
    if (args.length < 2) {
        const qnt = 100 - Banco.messages(msg.author.id);
        msg.channel.send(`${msg.author} Faltam exatamente ${qnt} mensagens até o seu próximo prêmio.`);
    } else {
        const user = msg.mentions.members.first();
        const qnt = 100 - Banco.messages(user.id);
        msg.channel.send(`${msg.author} Faltam exatamente ${qnt} mensagens até o próximo prêmio do(a) ${user.user.tag}.`);
    }
}

function sorteio(msg, args) {
    if (!isAdmin(msg.author)) return;
    if (sorteioCurrent !== -1) {
        msg.channel.send(`${msg.author} Já existe um sorteio rolando!`);
        return;
    }
    if (args.length < 3) {
        msg.channel.send(`${msg.author} É necessário dizer quanto dinheiro será sorteado e quanto tempo durará (em segundos) este sorteio!`);
        return;
    }

    const qnt = Number(args[1]);
    if (isNaN(qnt) || qnt <= 0 || qnt !== Math.trunc(qnt)) {
        msg.channel.send(`${msg.author} Quantidade inválida.`);
        return;
    }
    const time = Number(args[2]) * 1000;
    if (isNaN(time) || time <= 0 || time !== Math.trunc(time)) {
        msg.channel.send(`${msg.author} Duração inválida.`);
        return;
    }

    sorteioCurrent = new Sorteio(msg, qnt, time);
}

function rank(msg) {
    Banco.jsonOpen();
    const list = [...Banco.json.users];
    Banco.jsonClose();

    list.sort((a, b) => b.money - a.money);

    let text = "Rank de usuários (ordem: Nível de Burguesia):\n```";
    list.forEach((u, index) => {
        if (index >= 10) return;
        const member = msg.guild.members.find(a => a.id === u.userid);
        text += `${index + 1 + 'º' + (index === 9 ? ' ' : '  ')}- ${member.user.tag}\n`;
    });
    text += "```";
    msg.channel.send(text);
}

function mendigar(msg) {
    const result = Banco.mendigar(msg.author.id);
    if (result === -2) {
        msg.channel.send(`${msg.author} Você ainda não pode mendigar duas vezes em um dia!`);
    } else if (result === -1) {
        msg.channel.send(`${msg.author} Você não está registrado.`);
    } else if (result === 0) {
        msg.channel.send(`${msg.author} Infelizmente ninguém quis te doar nada.`);
    } else {
        msg.channel.send(`${msg.author} Parabéns! Alguém te doou \`$${result}\`!`);
    }
}

/*
    Função guardada para usos futuros
function normalizar(msg) {
    Banco.jsonOpen();

    this.json = Banco.json.users.map(user => {
        user.mendigagem = 0;
        return user;
    });

    Banco.jsonClose();
    msg.channel.send(`Normalizado!`);
}*/

module.exports = {
    register,
    semanal,
    onUserMessage,
    punish,
    loteria,
    bilhete,
    resultado,
    saldo,
    transfer,
    messages,
    pot,
    sorteio,
    rank,
    mendigar,
    corrida
};
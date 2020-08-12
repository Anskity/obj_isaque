# obj_isaque
## Criando um comando
* É necessário que todos os comandos estejam dentro de uma categoria da pasta `src/commands/` em um arquivo separado;
* Todos os comandos devem ser da interface `Command` declarada na `src/defs.ts`;
* O comando deverá ser exportado com `default`;
* Um template de um comando pode ser encontrado em `template.txt`;
* É necessário incluir o seu comando no arquivo `index.ts` de sua categoria.
## Interface `Command`
* `(msg:  Message, args:  Arguments) =>  Promise<void>`: A função que será executada quando o comando for chamado;
> **Argumentos:**
> * `msg: Message`: Mensagem que chamou o comando;
> * `args: Arguments`: Argumentos do comando;
> * `raw: string[]`: Argumentos apenas separados por espaço. Uso não recomendado.
* `permissions: Permission`: Permissões necessárias para o uso do comando;
* `aliases:  string[]`: Todos os *aliases* do comando (Ao menos 1 alias é obrigatório);
* `description:  string`: Breve resumo do comando (chamada quando `!!help`);
* `help:  string`: Mensagem de ajuda do comando (chamada quando `!!help seuComando`);
* `examples:  string[]`: Exemplo de uso do comando ou suas sintaxes.

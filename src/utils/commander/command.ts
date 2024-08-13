import { exit } from "node:process";

interface Option<R extends string, V> {
    name: string;
    short: string;
    argument: R;
    description?: string;
    defaultValue?: V;
    values?: V[];
}

type PickArgs<T extends string> = T extends `-${string}, --${string} <${infer R}>` ? R : never;
type PickCmd<T extends string, V> = T extends `${string} <${infer F}>` ? Command<{[k in F]: V}> : Command;

export class Command<Args extends object = {}> {
    options: Option<string, any>[] = [];
    commands = new Map<string, Command>();
    name: string;
    subname: string | undefined;
    _version = '';
    _description = '';

    constructor (name: string) {
        this.name = name
    }
    version (v: string) {
        this._version = v;
        return this
    }
    command <T extends string> (name: T) {
        if (this.subname) {
            throw new Error('subcommand already defined')
        }
        const [name1, name2] = name.split(/[\s\t]+/)
        const c = new Command(name1)
        if (name2) {
            if (/^<(.*?)>$/.test(name2)) {
                c.subname = name2.slice(1, -1)
            } else {
                throw new Error('invalid subcommand name')
            }
        }
        this.commands.set(name1, c)
        return c as PickCmd<T, any>
    }
    description (description: string) {
        this._description = description
        return this
    }
    option <T extends `-${string}, --${string} <${string}>`, F = string> (
        name_all: T, description?: string, defaultValue?: F, values?: F[]
    ): Command<Args & {[k in PickArgs<T>]: F}> {
        type R = PickArgs<T>
        const [short, name, arg ] = name_all.split(/[\s\t,]+/)
        const o: Option<R, F> = {
            name,
            short,
            argument: arg.slice(1, arg.length - 1) as R,
            description,
            defaultValue,
            values,
        }
        const t = this as Command<Args & {[k in PickArgs<T>]: F}>
        t.options.push(o)
        return t
    }

    actions: {(options: Args): void | Promise<void>}[] = []
    action (ac: {(options: Args): void | Promise<void>}) {
        this.actions.push(ac)
        return this
    }
    async parse (argv: string[]) {
        const { commands } = this
        const result: Record<any, any> = {}
        let command = this as unknown as Command
        for (let i = 2; i < argv.length; i++) {
            const item = argv[i];
            const next = argv[i + 1];
            switch (item) {
                case '-V':
                case '--version':
                    console.log(command._version)
                    exit(0)
                case '-h':
                case '--help':
                    console.log(command.showHelp())
                    exit(0)
                default:
            }
            if (item.startsWith('-')) {
                const op = command.options.find(o => o.short === item || o.name === item)
                if (op) {
                    const type = typeof (op.defaultValue || '')
                    if (!next.startsWith('-')) {
                        const value = type === 'string' ? next : JSON.parse(next)
                        if (op.values && op.values.indexOf(value) === -1) {
                            console.error(`Invalid value "${value}" for option "${op.name}", expected one of "${op.values}"`)
                            exit(1)
                        }
                        result[op.argument] = value;
                        i++
                    } else if (type === 'boolean') {
                        result[op.argument] = true;
                    } else {
                        console.error(`Missing value for option "${op.name}"`)
                        exit(1)
                    }
                } else {
                    console.log(`Unknown option "${item}"`)
                    exit(1)
                }
            } else {
                const cmd = commands.get(item)
                if (!cmd) {
                    console.error(`Unknown command "${item}"`)
                    exit(1)
                } else {
                    command = cmd
                    if (command.subname) {
                        result[command.subname] = next
                        i++
                    }
                }
            }
        }
        for (let i = 0; i < command.options.length; i++) {
            const op = command.options[i]
            if (op.defaultValue && !(op.argument in result)) {
                result[op.argument] = op.defaultValue
            }
        }
        for (let i = 0; i < command.actions.length; i++) {
            command.actions[i](result as any)
        }
    }

    private showHelp() {
        const { name, subname, _version, _description } = this
        const options = this.options.slice(0)
        const commands = [...this.commands.values()]
        if (_version) {
            options.push({ name: '--version', short: '-V', description: 'Show version number', argument: '' as never })
        }
        options.push({ name: '--help', short: '-h', description: 'Show help', argument: '' as never })
        return [
            `Usage: ${name} [options] ${_description || ''}`,
            `
Options:
${options.map(option => `  ${option.short}, ${option.name}\t\t${option.description}`).join('\n')}
`,
            commands.length > 0 && `
Commands:
${commands.map(cmd => `  ${cmd.name}${subname ? ` <${subname}>` : ''}${cmd.options.length > 0 ? ' [options]' : '          '}\t${cmd._description}`).join('\n')}
            `
        ].filter(l => !!l).join('\n')
    }
}
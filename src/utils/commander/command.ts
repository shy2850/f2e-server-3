import { exit } from "node:process";

interface Option<R extends string> {
    name: string;
    short: string;
    argument: R;
    description?: string;
    defaultValue?: string;
}

type PickArgs<T extends string> = T extends `-${string}, --${string} <${infer R}>` ? R : never;

export class Command<Args extends string = never, F extends string = never> {
    options: Option<Args>[] = [];
    commands = new Map<string, Command>();
    
    name: string;
    subname: string;
    _version = '';
    _description = '';

    constructor (name: `${string}` | `${string} <${F}>`) {
        this.name = name
        this.subname = name.split(' ')[1]?.replace(/<(.+)>/, '')
    }
    version (v: string) {
        this._version = v;
        return this
    }
    command (name: string) {
        const c = new Command(name)
        this.commands.set(name, c)
        return c
    }
    description (description: string) {
        this._description = description
        return this
    }
    option <T extends `-${string}, --${string} <${string}>`> (name_all: T, description?: string, defaultValue?: string): Command<Args | PickArgs<T>> {
        type R = PickArgs<T>
        const [short, name, arg ] = name_all.split(/[\s\t,]+/)
        const o: Option<R> = {
            name,
            short,
            argument: arg.slice(1, arg.length - 1) as R,
            description,
            defaultValue
        }
        const t = this as Command<Args | R>
        t.options.push(o)
        return t
    }

    actions: {(options: Record<Args, string>): void | Promise<void>}[] = []
    action (ac: {(options: Record<Args, string>): void | Promise<void>}) {
        this.actions.push(ac)
        return this
    }
    async parse (argv: string[]) {
        const { commands } = this
        const result: Partial<Record<any, string>> = {}
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
                    if (!next.startsWith('-')) {
                        result[op.argument] = next;
                        i++
                    } else {
                        result[op.argument] = '';
                    }
                } else {
                    console.log(`Unknown option ${item}`)
                    exit(1)
                }
            } else {
                const cmd = commands.get(item)
                if (!cmd) {
                    console.log(`Unknown command ${item}`)
                    exit(1)
                } else {
                    command = cmd
                }
            }
        }
        
        for (let i = 0; i < command.actions.length; i++) {
            command.actions[i](result as any)
        }
    }

    private showHelp() {
        const { name, _version, _description } = this
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
${commands.map(cmd => `  ${cmd.name}${cmd.options.length > 0 ? ', [options]' : '          '}\t${cmd._description}`).join('\n')}
            `
        ].filter(l => !!l).join('\n')
    }
}
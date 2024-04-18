import * as _ from '../src/utils/misc'

export const run_template = () => {
    const tpl = `<ul><li><a href="/{{pathname}}">..</a></li>{{each files}}<li><a href="/{{path}}">{{name}}</a></li>{{/each}}</ul>`
    const data = {
        pathname: 'ROOT_DIR',
        files: [
            { path: 'ROOT_DIR/index.html', name: 'index.html' },
            { path: 'ROOT_DIR/test.html', name: 'test.html' },
            { path: 'ROOT_DIR/test.js', name: 'test.js' },
            { path: 'ROOT_DIR/test.css', name: 'test.css' },
            { path: 'ROOT_DIR/test.png', name: 'test.png' },
        ]
    }
    console.log(
        _.template(tpl, data)
    )
}
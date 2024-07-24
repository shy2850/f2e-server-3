import * as path from 'node:path'
import * as fs from 'node:fs'

export const page_layout = fs.readFileSync(path.join(__dirname, '../../templates/page_layout.hbs'), 'utf8')

export const page_404 = fs.readFileSync(path.join(__dirname, '../../templates/page_404.hbs'), 'utf8')
export const page_500 = fs.readFileSync(path.join(__dirname, '../../templates/page_500.hbs'), 'utf8')
export const page_dir = fs.readFileSync(path.join(__dirname, '../../templates/page_dir.hbs'), 'utf8')

export const page_login = fs.readFileSync(path.join(__dirname, '../../templates/page_login.hbs'), 'utf8')


export const code_define = fs.readFileSync(path.join(__dirname, '../../templates/code_define.hbs'), 'utf8')
export const code_externals = fs.readFileSync(path.join(__dirname, '../../templates/code_externals.hbs'), 'utf8')
export const code_livereload = fs.readFileSync(path.join(__dirname, '../../templates/code_livereload.hbs'), 'utf8')
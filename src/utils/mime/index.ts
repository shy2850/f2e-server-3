
const types = {
    "text/html": ["html", "htm", "shtml"],
    "text/plain": ["txt", "text", "conf", "def", "list", "log", "in", "ini"],
    "text/markdown": ["markdown","md"],
    "application/javascript": ["js","mjs"],
    "application/json": ["json","map"],
    "application/json5": ["json5"],
    "text/css": ["css"],
    "text/csv": ["csv"],
    'image/png': ['png'],
    'image/jpg': ['jpg', 'jpeg'],
    'image/gif': ['gif'],
    "application/pdf": ["pdf"],
    "image/svg+xml": ["svg"],
    'audio/wav': ['wav'],
    'video/mp4': ['mp4'],
    "audio/mp4": ["m4a","mp4a"],
    "audio/ogg": ["oga","ogg","spx","opus"],
}
const suffix_map: Record<string, string> = {}
Object.entries(types).forEach(([key, value]) => {
    value.forEach(v => {
        suffix_map[v] = key
    })
})
let mime = {
    getType: (suffix: string, defaultType: string = 'application/octet-stream') => {
        return suffix_map[suffix] || defaultType
    }
}

export const setMimeTypes = function (types: Record<string, string>) {
    Object.assign(suffix_map, types)
}

export default mime
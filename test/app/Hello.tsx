import React from "react";

export default () => <>
    <h2>Hello <span className="text-red-500">当前模块支持 hmr</span> </h2>
    <p>测试中信息... tailwindcss</p>
    <div className="p-6 max-w-sm mb-4 mt-4 bg-white rounded-xl shadow-lg flex items-center space-x-4">
        <div className="shrink-0">
            <img className="h-12 w-12" src="https://tailwind.nodejs.cn/_next/static/media/1.4985e539.jpg" alt="ChitChat Logo" />
        </div>
        <div>
            <div className="text-lg font-medium text-black">ChitChat</div>
            <p className="text-slate-500">You have a new message!</p>
        </div>
    </div>
</>
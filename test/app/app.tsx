import React, { useEffect, useState } from "react";
import { Button, DatePicker, Space, version, ConfigProvider } from "antd";
import dayjs from 'dayjs'
import zh from 'dayjs/locale/zh-cn'
dayjs.locale(zh)
console.log(zh)
import zh_CN from 'antd/locale/zh_CN'

import styles from './style.less'

const App = () => {
    const [date, setDate] = useState(Date.now())
    useEffect(function () {
        const interval = setInterval(function () {
            setDate(Date.now())
        }, 500)
        return function () {
            clearInterval(interval)
        }
    }, [])

    return (
        <ConfigProvider locale={zh_CN}>
            <div>
                <h1>antd version: {version}</h1>
                <Space>
                    <DatePicker />
                    <Button type="primary">Primary Button</Button>
                    <span className="red">red</span> <span className="bold">bold</span> <span className="borderd">borderd</span>
                </Space>
                <p />
                {date && <Button.Group>
                    <Button type="primary">当前时间</Button>
                    <Button className={styles.strong}>{dayjs(date).format('YYYY年M月D日 HH:mm:ss')}</Button>
                </Button.Group>}
            </div>
        </ConfigProvider>
    );
};

export default App
module.exports = () => {
    return {
        options: {
            // 项目端口
            port: 9100,
            // 项目地址
            host: "dev.filament.com",
            // HTML模板
            template: "core/html/development.ejs",

        },
        // HTML页面标题
        title: "Filament Editor"
    };
};

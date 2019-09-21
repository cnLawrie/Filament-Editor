module.exports = () => {
    return {
        options: {
            // 项目端口
            port: 9106,
            // 项目地址
            host: "dev.realibox.com",
            // HTML模板
            template: "core/html/development.ejs",
           
        },
        // 资源公共目录
        publicPath: "/content/",
        // HTML页面标题
        title: "Realibox - 全平台3D可视化"
    };
};

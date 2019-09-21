module.exports = () => {
    return {
        options: {
               // 项目端口
            port: 9106,
            // 项目地址
            host: "dev.realibox.com",
            // HTML模板
            template: "core/html/production.ejs"
        },
        // 资源公共目录
        publicPath: "/content/",
        // HTML页面标题
        title: "Realibox - 全平台3D可视化",
        description:
            "Realibox是一款3D可视化全能制作工具，可制作3D交互产品、3D互动场景和AR/VR等XR视觉体验模式，输出可全渠道分发的原生H5，嵌入所有终端和平台。同时，Realibox为企业搭建3D数字化资产管理平台，针对3D数字视觉化营销服务为品牌企业赋能。",
        keywords:
            "3D可视化,AR,VR,XR,电商,三维动画,小家电,汽车,3D打印,3D视觉,互动体验,交互体验,沉浸式体验,全平台,跨平台,全终端"
    };
};

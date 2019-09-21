export default {
    // 首页
    index: () => "/",
    login: () => "/login",
    public: (params: any) => `/public/${params.uid}`,
    content: () => "/content",
    details: (params: any) => `/content/details/${params.uid}`,
    account: () => "/account",
};

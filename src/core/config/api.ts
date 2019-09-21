export default {
    users: (params: any) => `/v4/users/${params.username}`,

    tag: (params: any) => `/v4/tag/${params.tag_uid}`,

    tags: () => `/v4/tags`,

    tag_scenes: () => `/v4/tag/scenes`,

    download: (params: any) => `/v4/jobs/scene/download/${params.scene_uid}`,

    download_gltf: (params: any) =>
        `/v4/jobs/scene/gltf/download/${params.scene_uid}`,

    uploadModal: () => `v4/upload_policy/lite_source`,

    nodes: (params?: any) => `/v4/nodes${params ? "/" + params.uid : ""}`,

    scenes: (params?: any) => `/v4/scenes${params ? "/" + params.uid : ""}`,

    nodesOperate: () => `v4/nodes/manager`,

    jobsStatus: () => `v4/jobs/status`,

    jobsUploadStatus: () => `v4/jobs/upload_status`,

    uploadPolicyFile: (params = {}) => `/v4/upload_policy/file`,

    spaces: (params = {}) => `/v4/spaces`,

    current_space: (params = {}) => `/v4/current_space`,

    session: (params = {}) => `/v4/session`,

    scenes_basic: (params: any = {}) => `/v4/scenes/basic/${params.uid}`,

    nodeDetailByPath: (params = {}) => `/v4/node/detail_by_path`,

    upload_file: (params = {}) => `/v4/upload_policy2/file`,

    // 上传定制化 UI
    upload_ui: (params = {}) => `/v4/jobs/ui/pack`,

    crop_space_active: (params = {}) => `operation/v1/crop_space/active`,

    jobs_scenes_publish: (params = {}) => `/v4/jobs/scenes/publish`,
};

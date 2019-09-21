export const enum DETAILS_BTN_SELECTED {
    DETAILS,
    DOWNLOAD,
}
// 内容类型
export const enum CONTENT_TYPE {
    MODEL,
    PROJECT,
}
// 批量操作枚举
export const enum BATCH_OPERATION_STATUS {
    DEFAULT,
    OPEN,
    CLOSE,
}

export const enum SEARCH_STATUS {
    DEFAULT,
    OPEN,
    CLOSE,
}

export const enum UPLOAD_MODEL_STEP {
    DEFAULT,
    EDIT,
    UPLOADING,
    CONVERTING,
}
export const enum TAGS_MODEL_STATUS {
    DEFAULT,
    CREATE,
    EDIT,
    DELETE,
}

export enum MODAL_TYPE {
    HIDE,
    SHARE,
    DELETE,
    CREATE_FOLDER,
    CREATE_PROJECT,
    RENAME,
    MOVE,
    COPY,
    ROLES,
    FAILTURE,
}

export const enum ContentItemType {
    file = 0,
    dir = 1,
}

export enum PublishStatus {
    unpublished = 0,
    published = 1,
}

export enum CardMenu {
    share,
    rename,
    move,
    copy,
    edit,
    delete,
}

export enum SortType {
    sortByFileNameAsc,
    sortByFileNameDesc,
    sortByFileSizeAsc,
    sortByFileSizeDesc,
    sortByFileCreateTimeAsc,
    sortByFileCreateTimeDesc,
    sortByFileUpdateTimeAsc,
    sortByFileUpdateTimeDesc,
    sortByUnReleased,
    sortByReleased,
}

export const sortMap = (sort: SortType) => {
    const mapping = {
        [SortType.sortByFileNameAsc]: { field: "name", sort: "asc" },
        [SortType.sortByFileNameDesc]: { field: "name", sort: "desc" },
        [SortType.sortByFileSizeAsc]: { field: "size", sort: "asc" },
        [SortType.sortByFileSizeDesc]: { field: "size", sort: "desc" },
        [SortType.sortByFileCreateTimeAsc]: {
            field: "create_time",
            sort: "asc",
        },
        [SortType.sortByFileCreateTimeDesc]: {
            field: "create_time",
            sort: "desc",
        },
        [SortType.sortByFileUpdateTimeAsc]: {
            field: "update_time",
            sort: "asc",
        },
        [SortType.sortByFileUpdateTimeDesc]: {
            field: "update_time",
            sort: "desc",
        },
        [SortType.sortByUnReleased]: { field: "status", sort: "asc" },
        [SortType.sortByReleased]: { field: "status", sort: "desc" },
    };
    return mapping[sort];
};

export enum Mode {
    List,
    Card,
}

export enum ContentType {
    model,
    project,
}

export enum ErrorType {
    null,
    EmptyName,
    TooLongName,
    AlreadyExist,
}

export enum Permissions {
    check_all_object,
    manage_all_object,
    use_editor,
    cooperate_in_folder,
    project_download_and_upload,
    add_and_edit_tag,
    member_invite,
    role_and_permission_update,
    delete_member,
    use_studio,
    use_lite,
}

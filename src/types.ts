export interface Screen {
    id: string;
    name: string;
    yaml: string;
}

export interface AppInstance {
    id: string;
    name: string;
    screens: Screen[];
    startScreenId: string | null;
}

export interface UserWorkspace {
    apps: AppInstance[];
    activeAppId: string | null;
    activeScreenId: string | null;
}

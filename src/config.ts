// 文档路径配置
// 修改这里的 paths 来读取不同的设计文档项目

export const docsConfig = {
  // 网站名称
  siteName: "YooMdSite",
  docsPaths: [
    {
      name: "YooMdSite",
      path: "./content/docs/yoomdsite-docs",
      description: "YooMdSite 平台说明文档",
    },
  ],
  defaultDoc: "YooMdSite",
};

// 获取网站名称
export function getSiteName() {
  return docsConfig.siteName;
}

// 获取默认文档项目
export function getDefaultProject() {
  const defaultPath = docsConfig.docsPaths.find(
    (p) => p.name === docsConfig.defaultDoc,
  );
  return defaultPath || docsConfig.docsPaths[0];
}

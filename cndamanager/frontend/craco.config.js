const MiniCssExtractPlugin = require("mini-css-extract-plugin")

module.exports = {
  devServer: {
    port: 7000,
  },
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      if (webpackConfig["mode"] !== "production") return webpackConfig

      // Namespace js files under static_assets/js
      webpackConfig.output.filename =
        "static_assets/js/[name].[contenthash:8].js"
      webpackConfig.output.chunkFilename =
        "static_assets/js/[name].[contenthash:8].chunk.js"
      webpackConfig.output.assetModuleFilename =
        "static_assets/media/[name].[hash][ext]"

      // Same with media files
      webpackConfig.module.rules.forEach((ruleset) => {
        if (!ruleset.oneOf) return

        ruleset.oneOf.forEach((rule) => {
          if (rule.options && rule.options.name) {
            rule.options.name = rule.options.name.replace(
              "static",
              "static_assets"
            )
          }
        })
      })

      // And CSS files
      webpackConfig.plugins.forEach((plugin) => {
        if (!(plugin instanceof MiniCssExtractPlugin)) return

        plugin.options.filename =
          "static_assets/css/[name].[contenthash:8].css"
        plugin.options.chunkFilename =
          "static_assets/css/[name].[contenthash:8].chunk.css"
      })

      return webpackConfig
    },
  }
}

const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const SpriteLoaderPlugin = require('svg-sprite-loader/plugin');
//const { VueLoaderPlugin } = require('vue-loader');

module.exports = {
    entry: './src/main.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
    },
    devServer: {
        contentBase: path.resolve(__dirname,'src','assets'),
        proxy: {
            '/api': {
                target: 'http://129.69.127.226:13333',
                secure: false,
                disableHostCheck: true
            },
        },
        compress: true
    },
    module: {
        rules: [
            {
                test: /\.pug/,
                use: [
                    // { loader: 'html-loader' },
                    { loader: 'pug-loader' }
                ]
            },
            {
                test: /\.sass/,
                use: [
                    //{ loader: 'vue-style-loader', },
                    { loader: 'style-loader' },
                    { loader: 'css-loader' },
                    { loader: 'sass-loader' }
                ]
            },
            {
                test: /\.css/,
                use: [
                    //{ loader: 'vue-style-loader', },
                    { loader: 'style-loader' },
                    { loader: 'css-loader' }
                ]
            },
            {
                test: /\.svg/,
                use: [
                    { loader: 'svg-sprite-loader'}
                ]
            },
            {
                test: /\.png/,
                use: [
                    { loader: 'file-loader',
                        options: {
                            name: '[name]_[hash:7].[ext]',
                        }
                    }
                ]
            },
            {
                test: /\.(ttf|eot|woff|woff2)$/,
                loader: 'url-loader',
                options: {
                  name: 'fonts/[name].[ext]',
                },
            },
            //{
            //   test: /\.vue$/,
            //    use: 'vue-loader'
            //}
        ]
    },
    plugins: [
        //new VueLoaderPlugin(),
        // new CleanWebpackPlugin(['dist']),
        new HtmlWebpackPlugin({
            title: 'BSS Hochspannungstechnik',
            template : './src/index.pug',
        }),
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            moment: 'moment'
        }),
        new SpriteLoaderPlugin(),
    ]
}

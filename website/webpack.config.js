const path = require("path");
const webpack = require("webpack");
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WebpackDashboard = require('webpack-dashboard/plugin');

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
                target: 'http://localhost:5000',
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
                    { loader: 'style-loader' },
                    { loader: 'css-loader' },
                    { loader: 'sass-loader' }
                ]
            },
            {
                test: /\.css/,
                use: [
                    { loader: 'style-loader' },
                    { loader: 'css-loader' }
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
        ]
    },
    plugins: [
        // new CleanWebpackPlugin(['dist']),
        new HtmlWebpackPlugin({
            title: 'BSS Hochspannungstechnik',
            template : './src/index.pug',
        }),
        new webpack.ProvidePlugin({
            $: 'jquery'
        }),
        new WebpackDashboard(),
    ]
}

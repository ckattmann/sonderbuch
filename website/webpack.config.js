const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const SpriteLoaderPlugin = require('svg-sprite-loader/plugin');
const autoprefixer = require('autoprefixer');
//const { VueLoaderPlugin } = require('vue-loader');

function tryResolve_(url, sourceFilename) {
    // Put require.resolve in a try/catch to avoid node-sass failing with cryptic libsass errors
    // when the importer throws
    try {
        return require.resolve(url, {paths: [path.dirname(sourceFilename)]});
    } catch (e) {
        return '';
    }
}

function tryResolveScss(url, sourceFilename) {
    // Support omission of .scss and leading _
    const normalizedUrl = url.endsWith('.scss') ? url : `${url}.scss`;
    return tryResolve_(normalizedUrl, sourceFilename) ||
        tryResolve_(path.join(path.dirname(normalizedUrl), `_${path.basename(normalizedUrl)}`),
        sourceFilename);
}

function materialImporter(url, prev) {
    if (url.startsWith('@material')) {
        const resolved = tryResolveScss(url, prev);
        return {file: resolved || url};
    }
    return {file: url};
}

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
                test: /\.pug$/,
                use: [
                    // { loader: 'html-loader' },
                    { loader: 'pug-loader' }
                ]
            },
            {
                test: /\.sass$/,
                use: [
                    //{ loader: 'vue-style-loader', },
                    { loader: 'style-loader' },
                    { loader: 'css-loader' },
                    { loader: 'sass-loader' },
                ]
            },
            {
                test: /\.css$/,
                use: [
                    //{ loader: 'vue-style-loader', },
                    { loader: 'style-loader' },
                    { loader: 'css-loader' },
                ]
            },
            {
                test: /\.scss$/,
                use: [
                    //{ loader: 'vue-style-loader', },
                    { loader: 'file-loader' },
                    { loader: 'css-loader' },
                    { loader: 'postcss-loader',
                        options: {
                            plugins: () => [autoprefixer()]
                        }
                    },
                    { 
                        loader: 'sass-loader',
                         options: {
                            includePaths: ['./../node_modules'],
                            //importer: materialImporter,
                        }
                    },
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
            {
              test: /\.js$/,
               use: 'babel-loader'
            }
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

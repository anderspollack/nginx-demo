# NGINX!

NGINX is a very fast web server. It is fast due to NON-BLOCKING I/O, which means ...(asynchronous magic)... it doesn't create a new thread for each connection. This would cost something like 1mb each, which obviously does not scale when thousands of people are trying to access your website at the same time.

Another nice thing about NGINX is that configurations can be added or modified  without any downtime.

To handle config changes seamlessly, NGINX has a primary process and at least one worker process. The primary process is started when we run `nginx` for the first time. On a Mac with a `homebrew` installation of NGINX, run `brew services start nginx`. On Linux, the equivalent would be `sudo systemctl start nginx`. Once this is running, we typically don't touch it unless we need to update NGINX itself.

NGINX has one worker process by default that can handle 1024 connections at once. This is configurable with the `worker_processes` directive in the main context and the `worker_connections` directive in the `events` context in the configuration. Depending on our server's resources, we can tune these up or down as needed. More on "configuration contexts" later.

Now that NGINX is running, we can prove it by visiting http://localhost:8080 in the browser to see a default "everything's ok" HTML document.

## Configuration

NGINX configuration lives in text files. On my homebrew installation, the main NGINX config lives in `/usr/local/etc/nginx/nginx.conf`. On Linux, it's in `/etc/nginx/nginx.conf`. We can feel free to modify this file however we want since a copy of it is included in the same directory, `/usr/local/etc/nginx/nginx.conf.default`. But typically it's a good idea to keep application-specific configurations in their own files. We can put additional configs anywhere we like, but we have to let the main configuration file know where we put them. Let's take a look at the default config:

### Configuration Contexts

In `nginx.conf`, we can see it has the following at the top:

```
worker_processes  1;

events {
    worker_connections  1024;
}
```

`worker_processes` is what's called a directive. Basically a statement with one or more values, terminated by a semicolon.

`events {...}` is a "context", which has a name and a block surrounded by `{}` curlies. 

`worker_processes  1;` is at the root level of the config, so it is in the "main" context. the `events` context is used for global options affecting how NGINX generally handles connections, so it is home to the `worker_connections` directive. There can be only one `events` context. 

What happens if we add a second `events` context? Try it and run `nginx -t` and see the helpful message NGINX shows us:

```
nginx: [emerg] "events" directive is duplicate in /usr/local/etc/nginx/nginx.conf:16
nginx: configuration file /usr/local/etc/nginx/nginx.conf test failed
```

The `nginx -t` command checks our config for errors. Remove the error and rerun `nginx -t` to check that everything's ok again:

```
nginx: the configuration file /usr/local/etc/nginx/nginx.conf syntax is ok
nginx: configuration file /usr/local/etc/nginx/nginx.conf test is successful
```

## Let's actually do something

Since we are not optimizing server performance just yet, the `http` context is where stuff we typically care about lives, namely various `server` contexts for handling HTTP requests.

Check out the `listen` and `server_name` directives in the first default `server` block. These specify a default port `8080`, and a default server name `localhost`. `server_name` is where we would specify our site's domain name. If we remove the `server_name` entry, it will still default to `localhost`, but it is good to be explicit. This will also help with error handling.

Let's try to break it again. Here we duplicated the server block with the same `listen` port and `server_name`:

```
...
    # A duplicate server block for http://localhost:8080
    server {
        listen       8080;
        server_name localhost;
    }

    server {
        listen       8080;
        server_name localhost;

        #charset koi8-r;

        #access_log  logs/host.access.log  main;

        location / {
            root   html;
            index  index.html index.htm;
        }
...
```

Let's not check the syntax either. Just reload NGINX with `nginx -s reload`. We will see another helpful error message:

```
nginx: [warn] conflicting server name "localhost" on 0.0.0.0:8080, ignored
```

Visit http://localhost:8080 in the browser and notice that we can still see the default NGINX start page -- breaking the config and reloading did not shut down we server. It just refused to create a new worker process with the bad config and kept the old one running.

## Locations

`location` blocks are where we define what to do for specific request URIs. Look at the first one:

```
location / {
    root   html;
    index  index.html index.htm;
}
```

We see a `root` directive which specifies the directory where all the html files at this location live, and an `index` directive to specify which HTML file to load at `http://localhost:8080/`.

Where are these files though? the `root` directory `html` is a path relative to the value of the `--prefix` argument when running `nginx` commads. We can see the default value by running `nginx -V`:

```
 --prefix=/usr/local/Cellar/nginx/1.21.6_1
 ```

So our document root is at `/usr/local/Cellar/nginx/1.21.6_1/html/` by default, and we can see the index.html file:

```
ls /usr/local/Cellar/nginx/1.21.6_1/html/
# 50x.html    index.html
```

**Note**: This homebrew installation of NGINX uses a symlink for the default `html` directory. We can see where this actually is on the disk with `cd -P`:

```
cd -P /usr/local/Cellar/nginx/1.21.6_1/html/
pwd
# /usr/local/var/www
```

Let's make a new server and some different locations so we can see something other than the default NGINX start page. Let's also put it in a different place to keep it isolated from the rest of the main config. Scroll to the bottom of the default config's `http` context to see that there's already a default place to put additional configs:

```
    include servers/*;
```

This is relative to the current directory where this config lives, so `/usr/local/etc/nginx/servers/`

Let's a new file `/usr/local/etc/nginx/servers/test.conf` with a single server context:

```
server {
    listen 1234;
    return 200 "The server at http://localhost:1234 is running\n";
}
```

To verify everything is working, reload nginx and give it a whack:

```
nginx -s reload
curl localhost:1234
# The server at http://localhost:1234 is running
```

Now let's add some locations:

```
server {
    listen 1234;
    server_name localhost;
    root  /Users/apollack/Code/nginx-test;

    location / {
    }

    location /about {
    }
}
```

Let's set the `root` directive to point to a more familiar place on the disk. Also, instead of a `root` being set in each `location` context, let's set it in the parent `server` context so that it is set for all `location`s on this virtual server since all of the files are going to be in the same place. NGINX configuration contexts inherit from their parent context -- this is why settings in the main and `http` context (like the number of worker processes) still applies to this new server.

We also need to create two html files to correspond to our locations: `/Users/apollack/Code/nginx-test/index.html` and `/Users/apollack/Code/nginx-test/about/index.html`:

```html
<!-- index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8"/>
    <title>Home Page</title>
  </head>
  <body>
    <h1>Home Page</h1>
  </body>
</html>
```

```html
<!-- about/index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8"/>
    <title>About</title>
  </head>
  <body>
    <h1>About</h1>
  </body>
</html>
```

Now when we visit http://localhost:1234 we should see our "Home Page" and when we visit http://localhost:1234/about, we will see "About". Notice We don't have to add the `/index.html` to the URL -- NGINX already uses `index.html` as a default index.

We could make another version of our About page and point it to that instead, without having to change our old one:

```html
<!-- about/aboutv2.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8"/>
    <title>About</title>
  </head>
  <body>
    <h1>A New About Page</h1>
    <p>With exciting updates</p>
  </body>
</html>
```

And then just specify a different index in our `/about` location

```
server {
    listen 1234;
    server_name localhost;
    root  /Users/apollack/Code/nginx-test;

    location / {
    }

    location /about {
        index aboutv2.html
    }
}
```

## Error Pages and Rewrites

Let's create a custom 404 page:

```html
<!-- 404.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8"/>
    <title>404</title>
  </head>
  <body>
    <h1>Dang dude nothin here...</h1>
    <img src="/image/2d2e0bdb-b258-48e3-8379-7a00d76a1c3c/full/827,/0/default.jpg" alt="" />
  </body>
</html>
```

We then add an `error_page` directive to make NGINX handle requests to unavailable endpoints. Notice the `<img>` tag has a simplified IIIF `src` attribute. To ensure the HTTP request made by the image points to the correct place on https://media.getty.edu, we also add a `rewrite` directive which lets us replace those requests using a regex.

```
server {
    listen 1234;
    server_name localhost;
    root  /Users/apollack/Code/nginx-test;
    error_page 404 404.html;
    rewrite ^/(image)/(.*) https://media.getty.edu/iiif/$1/$2;

    location / {
    }

    location /about {
        index aboutv2.html;
    }
}
```

## Regex Location Matching

We can also return stuff for a specific URI pattern using a regex `location`. With the added location block below, only URIs that start with `/pages/` will return the dynamically generated heading:

```
server {
    listen 1234;
    server_name localhost;
    root  /Users/apollack/Code/nginx-test;
    error_page 404 404.html;
    rewrite ^/(image)/(.*) https://media.getty.edu/iiif/$1/$2;

    location / {
    }

    location /about {
        index aboutv2.html;
    }

    location ~* /pages/(.*) {
        default_type text/html;
        return 200 "<h1>Welcome to /pages/$1</h1>";
    }
}
```

The `~` indicates that this location should be matched using a regex pattern. The `~*` asterisk sets it to be case-insentitive, so anything will work. Visiting http://localhost:1234/pages/turtleboy will not 404, instead display the following:

```html
<h1>Welcome to /pages/turtleboy</h1>
```

## Reverse Proxying

What if one of our routes should point to a different app? We can set up a reverse proxy with the `proxy_pass` directive.

```
server {
    listen 1234;
    server_name localhost;
    root  /Users/apollack/Code/nginx-test;
    error_page 404 404.html;
    rewrite ^/(image)/(.*) https://media.getty.edu/iiif/$1/$2;

    location / {
    }

    location /about {
        index aboutv2.html;
    }

    location ~* /pages/(.*) {
        default_type text/html;
        return 200 "<h1>Welcome to /pages/$1</h1>";
    }

    location ~* /app {
        proxy_pass http://localhost:5678;
    }
}
```

Let's also make a little boilerplate Node app that runs on port 5678:

```js
// node-app.js
const http = require('http');

const hostname = '127.0.0.1';
const port = 5678;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  res.end(`
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"/>
      <title>Document</title>
    </head>
    <body>
      <h1>Fancy Node App</h1>
      <img src="https://1.bp.blogspot.com/-ioP8upBQiXo/T_pNt_EY4aI/AAAAAAAAD-8/KHhoI2Jcc5s/s1600/crystal+rotating+gif.gif">
    </body>
    </html>
  `);
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

```

Make sure to run the node app with `nodemon node-app.js` along with reloading NGINX, and visit http://localhost:1234/app to see a sparkly javascript app.

## Logging

NGINX also handles logging. Let's add an error log and access log to our `server` context:

```
server {
    listen 1234;
    server_name localhost;
    root  /Users/apollack/Code/nginx-test;
    error_page 404 404.html;
    rewrite ^/(image)/(.*) https://media.getty.edu/iiif/$1/$2;
    error_log /Users/apollack/Code/nginx-test/error.log info;
    access_log /Users/apollack/Code/nginx-test/access.log combined;

    location / {
    }

    location /about {
        index aboutv2.html;
    }

    location ~* /pages/(.*) {
        default_type text/html;
        return 200 "<h1>Welcome to /pages/$1</h1>";
    }

    location ~* /app {
        proxy_pass http://localhost:5678;
    }
}
```

The `info` / `combined` keywords specify the minimum level of logging, same as Linux syslog levels:  debug, info, notice, warning, error, crit, alert, emerg, panic. `combined` gives you everything. This lets you filter out excessive noise when things are behaving normally.

Watch all incoming connections or errors with `tail -f`:

```
tail -f ~/Code/nginx-test/access.log
tail -f ~/Code/nginx-test/error.log
```

Initial `venv` initialization

```bash
pip install flask flask_cors flask-jsonpify flask-sqlalchemy flask-restful Flask-Caching 'connexion[swagger-ui]'
```

Links:

  * https://www.codementor.io/@sagaragarwal94/building-a-basic-restful-api-in-python-58k02xsiq
  * https://realpython.com/flask-connexion-rest-api/
  * https://connexion.readthedocs.io/en/latest/
  * https://myridia.com/dev_posts/view/978
  * https://enable-cors.org/server_apache.html

Apache config

```xml
<IfModule mod_ssl.c>
<VirtualHost *:443>
  ErrorLog /var/log/apache2/board_error.log
  LogLevel warn
  CustomLog /var/log/apache2/board_access.log combined

  ServerName board.zapad.org
  ProxyPreserveHost On
  ProxyRequests Off
  <Location />
    ProxyPass http://localhost:8020/
    ProxyPassReverse http://localhost:8020/
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept"
  </Location>
SSLCertificateFile /etc/letsencrypt/live/board.zapad.org/fullchain.pem
SSLCertificateKeyFile /etc/letsencrypt/live/board.zapad.org/privkey.pem
Include /etc/letsencrypt/options-ssl-apache.conf
</VirtualHost>
</IfModule>
```

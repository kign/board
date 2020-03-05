import os.path
from flask import render_template, send_file, g
from flask_caching import Cache
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
import connexion

from model import Block

# Create the application instance

        # """
        # :param import_name: the name of the application package
        # :type import_name: str
        # :param host: the host interface to bind on.
        # :type host: str
        # :param port: port to listen to
        # :type port: int
        # :param specification_dir: directory where to look for specifications
        # :type specification_dir: pathlib.Path | str
        # :param server: which wsgi server to use
        # :type server: str | None
        # :param arguments: arguments to replace on the specification
        # :type arguments: dict | None
        # :param auth_all_paths: whether to authenticate not defined paths
        # :type auth_all_paths: bool
        # :param debug: include debugging information
        # :type debug: bool
        # :param resolver: Callable that maps operationID to a function
        # """

# https://connexion.readthedocs.io/en/latest/quickstart.html

dir = os.path.dirname(os.path.realpath(__file__))
app = connexion.App(__name__, specification_dir='./')

# Read the swagger.yml file to configure the endpoints
app.add_api('board.swagger')


# format is driver://user:pass@host/database
engine = create_engine('sqlite:///' + os.path.join(dir, "board.sqlite"), echo=False)
Session = sessionmaker(bind=engine)

cache = Cache(config={'CACHE_TYPE': 'simple'})
cache.init_app(app.app)


@app.app.before_request
def setup_session () :
    g.session = Session()
    g.cache = cache

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/static/<file_name>')
def staticx(file_name: str) :
	return send_file('static/' + file_name)

# If we're running in stand alone mode, run the application
if __name__ == '__main__':
    # Initialize on startup
    session = Session()

    try :
        n_blocks = session.query(Block).count()
        print(f'There are {n_blocks} blocks, we are good')
    except OperationalError :
        print("Creating new tables")
        Block.metadata.create_all(engine)

    app.run(host='0.0.0.0', port=8020, debug=True)

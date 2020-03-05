# https://docs.sqlalchemy.org/en/13/orm/tutorial.html

from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, BigInteger, String, Boolean


SQLABase = declarative_base()

class Block(SQLABase) :
	"Should reasonably match definition from board.swagger"
	__tablename__ = 'blocks'

	x = Column(Integer, primary_key=True)
	y = Column(Integer, primary_key=True)
	blocked = Column(Boolean)
	ts = Column(BigInteger)

	def __str__ (self) :
		return self.to_string()

	def __repr__ (self) :
		return self.to_string()

	def to_string (self) :
		return f'({self.x},{self.y}) {"X" if self.blocked else "_"} {self.ts}'

	def to_json(self) :
		return {'x' : self.x, 'y' : self.y, 'blocked' : self.blocked, 'ts': self.ts}

from flask import g
from model import Block
from pprint import pprint

def api_blocks(clientBlocks) :
	print(f'{len(clientBlocks)} incoming blocks')
	pprint(clientBlocks)

	N = 10000 # max possible Y size
	blocks = {sb.x * N + sb.y : sb for sb in g.session.query(Block)}
	for sb in blocks.values() :
		sb.push = True
	print(f'{len(blocks)} database blocks')
	pprint(blocks)

	for cb in clientBlocks :
		ii = cb['x'] * N + cb['y']
		sb = blocks.get(ii)
		if sb :
			if sb.ts <= cb['ts'] :
				sb.ts = cb['ts']
				sb.blocked = cb['blocked']
				sb.push = False
		else :
			sb = Block(x = cb['x'], y = cb['y'], ts = cb['ts'], blocked = cb['blocked'])
			g.session.add(sb)
			sb.push = False


	res = [sb.to_json() for sb in blocks.values() if sb.push]
	print(f'Returning {len(res)} blocks')
	pprint(res)

	print("Comitting")
	g.session.commit()

	return res

def api_reset() :
	g.session.query(Block).delete();

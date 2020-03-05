from flask import g
from model import Block
from pprint import pprint

def api_blocks(clientBlocks) :
	verbose = False

	if verbose :
		print(f'{len(clientBlocks)} incoming blocks')
		pprint(clientBlocks)

	N = 10000 # max possible Y size
	blocks = {sb.x * N + sb.y : sb for sb in g.session.query(Block)}
	for sb in blocks.values() :
		sb.push = True

	if verbose :
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

	if verbose :
		print(f'Returning {len(res)} blocks')
		pprint(res)

	if verbose :
		print("Comitting")
	g.session.commit()

	return res

def api_reset() :
	g.session.query(Block).delete();


def api_put_sprite(sprite) :
	print(f"Saving sprite({sprite['x']},{sprite['y']})")
	g.cache.set('sprite', sprite)

def api_get_sprite() :
	sprite = g.cache.get('sprite')
	if sprite :
		print(f"Returning sprite({sprite['x']},{sprite['y']})")
		return sprite
	else :
		print("No sprite saved")
		return None


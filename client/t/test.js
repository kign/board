'use strict';

board.init("myCanvas", 500, main_wrap);
//board.import('7,9,z20<::;:::Z::J::Bz26');
board.import('7,9,z14Z::J::V::;:::v::L:;s:::Z::J::rz16');

async function main_down_right () {

	while(true) {
		let n = 0;

		while(0 == await board.move_right ())
			n ++;

		if (board.try_right() == 1)
			return;

		while(0 == await board.move_down ())
			n ++;

		if (n == 0)
			return;
	}
}

async function main_orig () {
	let x;

	do {
	  x = await board.move_up ();
	}
	while (x == 0);

	await board.move_right ();
}

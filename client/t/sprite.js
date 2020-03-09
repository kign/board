'use strict';

async function main_wrap () {

	const norm = d => (d >= 0)? (d % 4) : ((4-((-d) % 4)) % 4);
	let mx=0, my=0;
	const tryd = d => {
		const x = norm(d);
		return ((x == 0)? board.try_up : ((x == 1)? board.try_right : (x == 2)? board.try_down : board.try_left))();
	}
	const moved = d => {
		const x = norm(d);
		if (x == 0) my++;
		if (x == 2) my--;
		if (x == 1) mx++;
		if (x == 3) mx--;
		return ((x == 0)? board.move_up : ((x == 1)? board.move_right : (x == 2)? board.move_down : board.move_left))();
	}


	let d = 1;
	while(0 == await moved (d));

	do {
		d ++;
	}
	while(tryd(d) != 0);

	mx = my = 0;
	while (true) {
		console.log("d =", d, " mx =", mx, " my =", my);
		//board.pause ();

		do {
			await moved(d);
			if (mx == 0 && my == 0)	break;
		}
		while(tryd(d) == 0 && tryd(d-1) != 0);

		if (mx == 0 && my == 0)	break;

		if (tryd(d - 1) == 0)
			d --;
		else { // tryd(d) != 0 && tryd(d-1) != 0
			do {
				d ++;
			}
			while(tryd(d) != 0);
		}
	}
	while (!(mx == 0 && my == 0));
}

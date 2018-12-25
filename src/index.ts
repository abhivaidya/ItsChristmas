import './styles/index.scss';
import 'pepjs';

import Game from './components/game';

window.addEventListener('DOMContentLoaded', () => {

    const game = new Game('#renderCanvas');
    game.doRender();

    // https://some.site/?id=123
    let parsedURL = new URL(window.location.href);
    game.from = (parsedURL.searchParams.get("from") as string).toUpperCase();
    game.to = (parsedURL.searchParams.get("to") as string).toUpperCase();
});
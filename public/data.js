// data.js
// Seed library data for the "May & Jay" watch tracker.
// This is the *default* content used only the first time the app runs
// (or if saved storage can't be read). After that, app.js reads/writes
// the live library from window.storage.

const seedItems = [
    {
        id: 1, title: 'Dune: Part Three', type: 'movie', category: 'Sci-Fi', year: 2026, duration: '2h 46m',
        poster: 'https://m.media-amazon.com/images/M/MV5BMDA2MDVmNWItODA3My00Mzc2LThmODMtMThhYTVlMGJkYjA4XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg',
        banner: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT5yyrEU3cBZ-ArACbiTlvczxmZLXtZXmVDrhRhiKIKhEkjtv7512a8-CLk5KVNk0Ko6CTytf3QXdfjNTAikSugKgSgUGvDh-yjZB7EI_s&s',
        description: 'Emperor Paul Atreides faces the fallout from his ascent to power as political plots and a galaxy-wide holy war endanger the future only he can see.',
        plannedDate: null, watched: null
    },
    {
        id: 2, title: 'The Tunnel to Summer, the Exit of Goodbyes', type: 'movie', category: 'Anime', year: 2022, duration: '1hr 25m',
        poster: 'https://m.media-amazon.com/images/S/pv-target-images/4a82ee31c8aea0161341732a02074166039609b3c1cacaf448ba8bd1041345ad.jpg',
        banner: 'https://m.media-amazon.com/images/S/pv-target-images/151342d25a933a21b65c29e05b23a076ec9a217552ebb74702c7814ee7c0c786.jpg',
        description: 'In a sleepy country town, a traumatized boy and a transfer student from Tokyo stumble upon a time-bending tunnel that may grant them their every wish.',
        plannedDate: null,
        watched: { may: { rating: 5.0, comment: 'I like the scene when he got her msg n come back' }, jay: { rating: 5.0, comment: 'They indeed yearn for each other' } }
    },
    {
        id: 3, title: 'The Garden of Words', type: 'movie', category: 'Anime', year: 2013, duration: '46m',
        poster: 'https://m.media-amazon.com/images/M/MV5BYjdiMDdlMDItOGM4Ny00YmE4LTk0MTEtMGRhM2Y4OWZkZDZkXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg',
        banner: 'https://imgsrv.crunchyroll.com/cdn-cgi/image/fit=contain,format=auto,quality=85,width=1200,height=675/catalog/crunchyroll/ec1f242bc776dc958d0c069195337534.jpg',
        description: 'On a rainy morning in Tokyo, 15-year-old Takao, an aspiring shoemaker, decides to skip class to sketch designs in a beautiful garden.',
        plannedDate: null,
        watched: { may: { rating: 4.5, comment: 'I wanna see them end up together!' }, jay: { rating: 4.0, comment: 'I need Part 2!' } }
    },
    {
        id: 4, title: '5 Centimeters per Second', type: 'movie', category: 'Anime', year: 2007, duration: '1h 3m',
        poster: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQ2qjimhfz6MrDqMojN810TpZLnyYXcYsl2acA_fv_GCkyczoZQ_aq2McGaYgHjPqXSv08RRsktt3oRItB0BO5yCz9D1-BoxuhIyXbl2DDIw&s=10',
        banner: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCVkpxvVllEul1tfD-Y5j29oEvL9abYQylMIiF_JV5Mg&s=10',
        description: 'Told in three interconnected segments, Takaki tells the story of his life as cruel winters, cold technology, and finally, adult obligations and responsibility converge to test the delicate petals of love.',
        plannedDate: null,
        watched: { may: { rating: 5.0, comment: 'Acceptance from the past is the key to move forward in life.' }, jay: { rating: 5.0, comment: 'May does not have comment here, she steals it' } }
    },
    {
        id: 5, title: 'The Apothecary Diaries', type: 'series', category: 'Anime', year: 2023, duration: '23m',
        poster: 'https://m.media-amazon.com/images/M/MV5BNGM1MTE4N2ItNWMxYS00MjhjLTllODYtYTViNDcxZGMxNjBkXkEyXkFqcGc@._V1_.jpg',
        banner: 'https://gcp-na-images.contentstack.com/v3/assets/bltea6093859af6183b/blt62c20917ad8fb87d/6998c56bf1b0824ede6f135b/EP01_00003.jpg?branch=production&width=3840&quality=75&auto=webp&crop=3:2',
        description: 'A young maiden is kidnapped and sold into servitude at the emperors palace, where she secretly employs her pharmacist skills with the help of the head eunuch to unravel medical mysteries in the inner court.',
        plannedDate: null, watched: null
    },
    {
        id: 6, title: 'The Apothecary Diaries 2', type: 'series', category: 'Anime', year: 2025, duration: '23m',
        poster: 'https://a.storyblok.com/f/178900/1064x1596/905ea6e912/the-apothecary-diaries-season-2-key-art.png/m/filters:quality(95)format(webp)',
        banner: 'https://static0.gamerantimages.com/wordpress/wp-content/uploads/2024/12/maomao-in-apothecary-diaries-poster.jpg',
        description: 'Using her wit and vast knowledge of medicines and poisons alike, Maomao played a pivotal role in solving a series of mysteries and conspiracies that plagued the imperial court.',
        plannedDate: null, watched: null
    },
    {
        id: 7, title: 'Sinners', type: 'movie', category: 'Thriller', year: 2025, duration: '2hr 17m',
        poster: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSB3LKwH9SQGi0bFbmdwFBB7hC4zEbEi1RRBLLV5eLnUw&s=10',
        banner: 'https://i0.wp.com/multiverseofcolor.com/wp-content/uploads/2025/04/Sinners-Movie-scaled.jpg?resize=1122%2C748&ssl=1',
        description: 'Trying to leave their troubled lives behind, twin brothers return to their hometown to start again, only to discover that an even greater evil is waiting to welcome them back.',
        plannedDate: null, watched: null
    },
    {
        id: 8, title: 'The Old Guard', type: 'movie', category: 'Thriller', year: 2020, duration: '2hr 05m',
        poster: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUSNZp_RPt-6zWWs8sTGMkwDkCC0d5-BXNxzI3NwMlh_aXAucgqpY0V5c&s=10',
        banner: 'https://media.newyorker.com/photos/5f0750ec35257179ff2c37f7/master/pass/Brody-TheOldGuard.jpg',
        description: 'A covert group of tight-knit mercenaries with an inability to die have fought to protect the world for centuries. But when their abilities are suddenly exposed, they need to eliminate the threat of those who seek to replicate their power.',
        plannedDate: null, watched: { may: { rating: 4.5, comment: '' }, jay: { rating: 4.0, comment: '' } }
    },
    {
        id: 9, title: 'The Old Guard 2', type: 'movie', category: 'Thriller', year: 2025, duration: '1hr 47m',
        poster: 'https://m.media-amazon.com/images/M/MV5BZmFhNWY1MjEtZTkyZS00ZWIzLTk4ZWItMDM0MzliNmE1ZGZhXkEyXkFqcGc@._V1_.jpg',
        banner: 'https://dmtalkies.com/wp-content/uploads/2025/07/The-Old-Guard-2-Movie-Summary-Andy-Discord-Quynh-and-others.jpg',
        description: 'Andy leads immortal warriors against a powerful enemy threatening their group. They grapple with the resurfacing of a long-lost immortal, complicating their mission to safeguard humanity.',
        plannedDate: null, watched: { may: { rating: 4.0, comment: '' }, jay: { rating: 4.0, comment: '' } }
    },
    {
        id: 10, title: 'Project Hail Mary', type: 'movie', category: 'Sci-Fi', year: 2026, duration: '2hr 36m',
        poster: 'https://m.media-amazon.com/images/M/MV5BNTkwNzJiYTctNzI3NC00NjE1LTlhYjktY2Q5MTdmMWFmNzcxXkEyXkFqcGc@._V1_.jpg',
        banner: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSrOtmsJnZEu-d2HO0oYy4tWqYEIX0SC7kOmt9wb2dDb0CGGex5cIgEy_ud&s=10',
        description: 'A science teacher wakes up alone on a spaceship. As his memory returns, he uncovers a mission to stop a mysterious substance killing Earths sun, and realizes that an unexpected friendship may be the key.',
        plannedDate: null, watched: { may: { rating: 5.0, comment: '' }, jay: { rating: 5.0, comment: 'Absolute cinema, It is 👎' } }
    },
    {
        id: 11, title: 'Inception', type: 'movie', category: 'Sci-Fi', year: 2010, duration: '2hr 28m',
        poster: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_FMjpg_UX1000_.jpg',
        banner: 'https://miro.medium.com/v2/resize:fit:1400/1*8Zbd3iNhIquius0T80ympw.jpeg',
        description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a CEO, but his tragic past may doom the project and his team to disaster.',
        plannedDate: null,
        watched: { may: { rating: 5.0, comment: 'i dont know what to comment but it is my fave' }, jay: { rating: 5.0, comment: 'Let Christopher nolan cook here' } }
    },
    {
        id: 12, title: 'The Idea of you', type: 'movie', category: 'Romance', year: 2024, duration: '1h 56m',
        poster: 'https://resizing.flixster.com/wV43LjsGt0QL6XSY-smx2uiCReI=/ems.cHJkLWVtcy1hc3NldHMvbW92aWVzLzlhMmM2NWRlLWNlNmYtNDk4Zi1iNzlmLTE4YTg2NzRiZWU5YS5qcGc=',
        banner: 'https://ew.com/thmb/YZoPPd0fD5hsoo-g7sn7h_Mry1w=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/The-Idea-of-You-Anne-Hathaway-Nicholas-Galitzine-032924-tout-73658cc87d9f4a10aaa024fe6528ed63.jpg',
        description: '40-year-old single mom Solène begins an unexpected romance with 24-year-old Hayes Campbell, the lead singer of August Moon, the hottest boy band on the planet.',
        plannedDate: null,
        watched: { may: { rating: 4.0, comment: 'Their relationship moving too fast than I expected 😆' }, jay: { rating: 4.5, comment: 'I hope people will just mind their own business' } }
    },
    {
        id: 13, title: 'The Wind Rises', type: 'movie', category: 'Anime', year: 2013, duration: '2h 06m',
        poster: 'https://m.media-amazon.com/images/M/MV5BMTU4NDg0MzkzNV5BMl5BanBnXkFtZTgwODA3Mzc1MDE@._V1_FMjpg_UX1000_.jpg',
        banner: 'https://images.bauerhosting.com/legacy/empire-tmdb/films/149870/images/cMrvn4Hl0A0NAL61BpDWQIsMsiN.jpg?ar=16%3A9&fit=crop&crop=top&auto=format&w=1440&q=80',
        description: 'Jiro Horikoshi studies assiduously to fulfill his aim of becoming an aeronautical engineer. As WWII begins, fighter aircraft designed by him end up getting used by the Japanese Empire against its foes.',
        plannedDate: null, watched: null
    },
    {
        id: 14, title: 'FLIPPED', type: 'movie', category: 'Romance', year: 2010, duration: '1h 30m',
        poster: 'https://images.moviesanywhere.com/36b813452af577491b55470e9c09b290/a5a733c4-c347-493a-9a90-771b799846fe.jpg',
        banner: 'https://www.sheknows.com/wp-content/uploads/2018/12/flipped-movie-review_wezryc.jpeg',
        description: 'When Juli meets Bryce in the second grade, she knows its true love. After spending six years trying to convince Bryce of the same, shes ready to give up--until he starts to reconsider.',
        plannedDate: null,
        watched: { may: { rating: 5.0, comment: 'I like how getting to know someone can completely change the way we see them' }, jay: { rating: 5.0, comment: 'I love how they tackle each unique personalities' } }
    },
    {
        id: 15, title: 'The Menu', type: 'movie', category: 'Thriller', year: 2022, duration: '1h 47m',
        poster: 'https://m.media-amazon.com/images/M/MV5BN2Q0YWE1MjktODJlMi00NTRiLWI2ZTctZTAxNjkyODVjM2EyXkEyXkFqcGc@._V1_QL75_UX380_CR0,4,380,562_.jpg',
        banner: 'https://m.media-amazon.com/images/M/MV5BZjk5OTk3YjMtNTczMy00ZDI0LTg3OGMtNjJjMzU1YzdmZDQ1XkEyXkFqcGc@._V1_QL75_UX328_.jpg',
        description: 'A young couple travels to a remote island to eat at an exclusive restaurant where the chef has prepared a lavish menu, with some shocking surprises.',
        plannedDate: null,
        watched: { may: { rating: 4.5, comment: 'The story is different from other movie watched so far 😆' }, jay: { rating: 4.5, comment: 'That is a real cheeseburger' } }
    },
    {
        id: 16, title: 'My Love Story with Yamada-kun at Lv999', type: 'series', category: 'Anime', year: 2023, duration: '24m',
        poster: 'https://m.media-amazon.com/images/M/MV5BOGU4NzQ3YzQtOTU4MC00ZGMzLThlOGMtODMzODg3YzM1Mzg2XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg',
        banner: 'https://m.media-amazon.com/images/M/MV5BZjE1MTYzZWItOWUwNC00MmQwLTkyNjktNjVmMDMyYzM2NzNjXkEyXkFqcGc@._V1_FMjpg_UX1280_.jpg',
        description: 'After her boyfriend breaks up with her for another girl, Akane Kinoshita decides she is going to make him regret his decision. Unexpectedly, however, she meets a socially awkward gamer who might just solve all of her problems.',
        plannedDate: null, watched: null
    },
    {
        id: 17, title: 'Gone Girl', type: 'movie', category: 'Thriller', year: 2014, duration: '2h 29m',
        poster: 'https://m.media-amazon.com/images/M/MV5BMTk0MDQ3MzAzOV5BMl5BanBnXkFtZTgwNzU1NzE3MjE@._V1_QL75_UY562_CR1,0,380,562_.jpg',
        banner: 'https://m.media-amazon.com/images/M/MV5BODAwNTY3Nzk4NF5BMl5BanBnXkFtZTgwMDY4MTQyMzE@._V1_QL75_UX1000_CR0,0,1000,563_.jpg',
        description: 'The husband of a missing woman becomes the main suspect in her disappearance.',
        plannedDate: null,
        watched: { may: { rating: 5.0, comment: 'Nick just mess up with the wrong girl The way Amy take revenge on her cheating husband 😣' }, jay: { rating: 5.0, comment: 'Its so good that i hated it Great movie' } }
    },
    {
        id: 18, title: 'The Proposal', type: 'movie', category: 'Romance', year: 2009, duration: '1h 48m',
        poster: 'https://m.media-amazon.com/images/M/MV5BYWU3ZmFhYTktNzU4NS00ZTEyLTkwNTYtMWE1M2JjMTFmODVkXkEyXkFqcGc@._V1_QL75_UY562_CR0,0,380,562_.jpg',
        banner: 'https://m.media-amazon.com/images/M/MV5BMTQ2MDY1NTIwNl5BMl5BanBnXkFtZTgwNjIzODM4MjE@._V1_QL75_UY563_CR172,0,1000,563_.jpg',
        description: 'When New York editor Margaret faces deportation, she convinces her assistant Andrew to marry her in return for a promotion. However, when she visits his hometown, it changes her in many ways.',
        plannedDate: null,
        watched: null
    },
    {
        id: 19, title: 'Encounter', type: 'series', category: 'Romance', year: 2018, duration: '1h 48m',
        poster: 'https://m.media-amazon.com/images/M/MV5BMGM0MzNiODgtMWUzNy00MDliLTk5MzgtOGM5NTRjOTBmN2E1XkEyXkFqcGc@._V1_FMjpg_UX800_.jpg',
        banner: 'https://m.media-amazon.com/images/M/MV5BY2M2NDRhY2YtNjdiZC00OGRlLWFkY2MtYzUxZmM1OTFhMDRhXkEyXkFqcGc@._V1_FMjpg_UX2048_.jpg',
        description: 'Brought together by fate, a woman who seems to have everything and a young man who seems to have nothing decides to give up an ordinary life to be together.',
        plannedDate: null,
        watched: null
    },
    {
        id: 20, title: 'The Fragrant Flower Blooms with Dignity', type: 'series', category: 'Romance', year: 2025, duration: '23m',
        poster: 'https://m.media-amazon.com/images/M/MV5BY2Q0NTNlMTAtZGVkYS00NDU1LThjYzYtZDQ3M2U5NGJiNzhkXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
        banner: 'https://m.media-amazon.com/images/M/MV5BN2M2MWMyYmItZGUyZC00MWQ0LTg4MDctYTdkMmMwYTc4Mjg5XkEyXkFqcGc@._V1_.jpg',
        description: 'An elite girls school resides next to a boys school for delinquents. One day, two students from each school, Kaoruko and Rintaro, meet and develop a connection.',
        plannedDate: null,
        watched: null
    }
];

const defaultCategoryOrder = ['Action', 'Sci-Fi', 'Drama', 'Horror', 'Comedy', 'Anime', 'Thriller', 'Romance'];

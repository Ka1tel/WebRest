import React from 'react'
import './CardAbout.css'

export default function CardAbout() {
  return (
    <>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"></link>
    <h1 className='aboutus'>Немного о нас</h1>
    <div className='Content'>
    <div>
    <h2 className='textabout'>TastySpot — ваш гид по миру вкуса</h2>
    <div className='desctext'>P.S.Мы не просто пишем о еде.</div>
    </div>
    <div className='Cards'>
    <div className="feature"><i class="bi bi-chat-left-heart rew"></i>Детальные обзоры — от интерьера до послевкусия.</div>
        <div className="feature"><i class="bi bi-fire fire"></i>Только то, что стоит попробовать — без воды и рекламного мусора.</div>
        <div className="feature"><i class="bi bi-people-fill people"></i>Реальные отзывы — без фейков и подделок.</div>
        </div>
        </div>
    </>
    
    
  )
}

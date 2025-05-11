import React from 'react'
import './Hero.css'

export default function MainPage() {
  return (
    <>
    <link href="https://fonts.googleapis.com/css?family=Montserrat:100,200,300,regular,500,600,700,800,900,100italic,200italic,300italic,italic,500italic,600italic,700italic,800italic,900italic" rel="stylesheet" />
        <div className='CardAbout'>
        <div className='CardText'>
        <h1 style={{font: "36px"}}>Обзоры лучших ресторанов</h1>
        <p style={{font: "32px"}} className='Text' >для истинных ценителей кулинарии</p>
        <p style={{font: "30px" , fontStyle: "regular" , color: "#8C8C8C"}} className='Text'>Мы обозреваем лучшие рестораны в Беларусии</p>
        <button className='BtnCard'>Заведения</button> 
        </div>
        <img src="https://i.pinimg.com/736x/ec/69/9c/ec699c4af722ae86fb6e684d6e5f737d.jpg" alt="завведение" className='ImageCard'/>
        </div>
    </>
    
  )
}

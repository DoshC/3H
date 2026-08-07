const header = document.querySelector('header');
  const toggleHeader = ()=> header.classList.toggle('scrolled', window.scrollY > 40);
  toggleHeader();
  window.addEventListener('scroll', toggleHeader);

  const slides = document.querySelectorAll('.hero-slide');
  let slideIdx = 0;
  if(slides.length > 1){
    setInterval(()=>{
      slides[slideIdx].classList.remove('active');
      slideIdx = (slideIdx + 1) % slides.length;
      slides[slideIdx].classList.add('active');
    }, 5000);
  }

  const tabs = document.querySelectorAll('.tab-btn');
  const cards = document.querySelectorAll('.tour-card');
  tabs.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      tabs.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.tab;
      cards.forEach(c=>{
        c.classList.toggle('show', c.dataset.cat === cat);
      });
    });
  });
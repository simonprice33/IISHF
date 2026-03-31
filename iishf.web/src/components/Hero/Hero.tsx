export function Hero() {
  return (
    <section className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] py-10 min-h-[400px]">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap">
          <div className="w-full md:w-7/12">
            <h1 className="text-4xl md:text-[63px] text-[#f7941d] mt-12 font-light leading-tight">
              Welcome to <br />Inline Skater Hockey
            </h1>
            <p className="mt-12 font-sans text-lg md:text-[34px] leading-relaxed text-[#DEDEDE] drop-shadow-lg">
              A fast, physical, dynamic, strategic team sport that requires great concentration and coordination of all team members.
            </p>
          </div>
          <div className="w-full md:w-5/12 text-center">
            <img
              className="w-full h-auto mx-auto"
              src="/images/netminder.png"
              alt="Netminder"
            />
          </div>
        </div>
      </div>
    </section>
  );
}